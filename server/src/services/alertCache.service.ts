// Сервис работы с горячими алертами (src/services/alertCache.service.ts)
import { redis } from '../redis.js';

export async function saveHotAlert(incident: {
    id: string;
    systemObjectId: number;
    dispatcherName: string;
    scenario: string;
    probability: number;
    recommendation: string | null;
    triggerFactors: any;
}) {
    const key = `alert:${incident.id}`;
    
    // 1. Сохраняем сам алерт как строку JSON с TTL на 2 часа (7200 сек)
    await redis.set(key, JSON.stringify(incident), 'EX', 7200);

    // 2. Добавляем ID в Sorted Set активных алертов, где score — это вероятность (или timestamp)
    // Это позволит мгновенно доставать топ самых опасных аварий!
    await redis.zadd('active_alerts_by_risk', incident.probability, incident.id);
    }

    export async function getTopHotAlerts(limit = 10) {
    // Забираем ID с наивысшим скором опасности
    const alertIds = await redis.zrevrange('active_alerts_by_risk', 0, limit - 1);
    if (alertIds.length === 0) return [];

    const rawAlerts = await redis.mget(alertIds.map((id) => `alert:${id}`));
    return rawAlerts.filter(Boolean).map((item) => JSON.parse(item!));
}