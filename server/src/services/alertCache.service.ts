// src/services/alertCache.service.ts
import { redis } from '../redis.js';
import { EventEmitter } from 'node:events';

export const alertEvents = new EventEmitter();

// 7 дней как страховочный трос от зависших алертов
const ALERT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface HotAlertPayload {
    id: string | number;
    systemObjectId: number;
    dispatcherName: string;
    scenario: string;
    probability: number;
    recommendation: string | null;
    triggerFactors: any;
}

export async function saveHotAlert(incident: HotAlertPayload) {
    const alertId = String(incident.id);
    const key = `alert:${alertId}`;

    // 1. Сохраняем тело алерта с недельным запасом по времени
    await redis.set(key, JSON.stringify(incident), 'EX', ALERT_TTL_SECONDS);

    // 2. Оповещаем подписчиков SSE о новом инциденте
    alertEvents.emit('hot_alert', incident);

    // 3. Индексируем в Sorted Set по уровню опасности
    await redis.zadd('active_alerts_by_risk', incident.probability, alertId);
    }

export async function resolveHotAlert(incidentId: string | number) {
    const alertId = String(incidentId);
    const key = `alert:${alertId}`;

    // Удаляем запись и вычищаем ID из индекса
    await redis.del(key);
    await redis.zrem('active_alerts_by_risk', alertId);

    // Оповещаем SSE-клиенты, чтобы дашборд сразу снял подсветку
    alertEvents.emit('alert_resolved', { id: alertId });
    }

export async function getTopHotAlerts(limit = 10) {
    const alertIds = await redis.zrevrange('active_alerts_by_risk', 0, limit - 1);
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

    // Фоновая зачистка на случай, если алерт провисел дольше 7 дней
    if (expiredIds.length > 0) {
        redis.zrem('active_alerts_by_risk', ...expiredIds).catch(() => {});
    }

    return validAlerts;
}