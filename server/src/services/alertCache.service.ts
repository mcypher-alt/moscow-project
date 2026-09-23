// src/services/alertCache.service.ts
import { redis } from '../redis.js';
import { EventEmitter } from 'node:events';

export const alertEvents = new EventEmitter();

// 7 дней как страховочный трос от зависших алертов
const ALERT_TTL_SECONDS = 7 * 24 * 60 * 60;
const ACTIVE_ALERTS_SET = 'active_alerts';

export interface HotAlertPayload {
    id: string | number;
    systemObjectId: number;
    dispatcherName: string;
    probability?: number;
    scenario: string;         // Тип инцидента (что сломается)
    horizon: string;          // Временной горизонт наступления
    reason: string;           // Причина / триггер
    recommendation: string | null;
    createdAt?: string;
}

export async function saveHotAlert(incident: HotAlertPayload) {
    const alertId = String(incident.id);
    const key = `alert:${alertId}`;
    const timestamp = Date.now();

    const payload: HotAlertPayload = {
        ...incident,
        createdAt: incident.createdAt || new Date().toISOString(),
    };

    // 1. Сохраняем тело инцидента с недельным TTL
    await redis.set(key, JSON.stringify(payload), 'EX', ALERT_TTL_SECONDS);

    // 2. Пушим событие подписчикам SSE для вывода карточки в UI
    alertEvents.emit('hot_alert', payload);

    // 3. Индексируем в Sorted Set по таймстемпу (свежие инциденты будут первыми)
    await redis.zadd(ACTIVE_ALERTS_SET, timestamp, alertId);
    }

    export async function resolveHotAlert(incidentId: string | number) {
    const alertId = String(incidentId);
    const key = `alert:${alertId}`;

    // Удаляем запись и вычищаем ID из активного индекса
    await redis.del(key);
    await redis.zrem(ACTIVE_ALERTS_SET, alertId);

    // Оповещаем SSE-клиенты для мгновенного снятия подсветки/баннера в UI
    alertEvents.emit('alert_resolved', { id: alertId });
    }

    export async function getTopHotAlerts(limit = 10) {
    // Забираем последние актуальные инциденты (от самых свежих к старым)
    const alertIds = await redis.zrevrange(ACTIVE_ALERTS_SET, 0, limit - 1);
    if (alertIds.length === 0) return [];

    const keys = alertIds.map((id) => `alert:${id}`);
    const rawAlerts = await redis.mget(keys);

    const validAlerts: HotAlertPayload[] = [];
    const expiredIds: string[] = [];

    rawAlerts.forEach((item, index) => {
        if (item) {
        validAlerts.push(JSON.parse(item));
        } else {
        const deadId = alertIds[index];
        if (deadId) expiredIds.push(deadId);
        }
    });

    // Зачистка ключей из Sorted Set, если запись уже истекла по TTL
    if (expiredIds.length > 0) {
        redis.zrem(ACTIVE_ALERTS_SET, ...expiredIds).catch(() => {});
    }

    return validAlerts;
}