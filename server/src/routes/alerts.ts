import { Router, Request, Response } from 'express';
import { getTopHotAlerts, resolveHotAlert, alertEvents } from '../services/alertCache.service.js';
import { acknowledgeIncident } from '../services/incident.service.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.js';
import { Role } from '@prisma/client';

const router = Router();

// 1. Первоначальная загрузка активных аварий при открытии страницы
router.get('/hot', authenticateJwt,
    requireRoles(Role.DISPATCHER, Role.ADMIN),
    async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const alerts = await getTopHotAlerts(limit);
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка получения активных алертов' });
    }
});

// 2. Квитирование (снятие) аварии диспетчером
router.post('/:id/ack', authenticateJwt,
    requireRoles(Role.DISPATCHER, Role.ANALYST, Role.ADMIN),
    async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Параметр id обязателен' });
    }

    try {
        const result = await acknowledgeIncident(id);

        if (!result) {
            return res.status(404).json({
                error: `Инцидент с ID ${id} не найден`,
            });
        }

        res.json({ success: true, acknowledgedId: result.id });
    } catch (err) {
        res.status(500).json({ error: 'Не удалось квитировать инцидент' });
    }
});

// 3. Стрим SSE для живых обновлений
router.get('/stream', (req: Request, res: Response) => {
    // 1. CORS-заголовки
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // ❗️ ВОТ ЭТА СТРОКА: глушит блокировку от Helmet для стрима
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // 2. Стандартные заголовки SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 3. Немедленная отправка заголовков в сокет
    res.flushHeaders();

    // Первичное подтверждение рукопожатия
    res.write(`data: ${JSON.stringify({ status: 'CONNECTED' })}\n\n`);

    // 4. Heartbeat (каждые 15 сек)
    const keepAliveTimer = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 15000);

    const onNewAlert = (alert: any) => {
        res.write(`event: hot_alert\ndata: ${JSON.stringify(alert)}\n\n`);
    };

    const onResolveAlert = (data: { id: string }) => {
        res.write(`event: alert_resolved\ndata: ${JSON.stringify(data)}\n\n`);
    };

    alertEvents.on('hot_alert', onNewAlert);
    alertEvents.on('alert_resolved', onResolveAlert);

    req.on('close', () => {
        clearInterval(keepAliveTimer);
        alertEvents.off('hot_alert', onNewAlert);
        alertEvents.off('alert_resolved', onResolveAlert);
        res.end();
    });
});

export default router;