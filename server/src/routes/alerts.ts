import { Router, Request, Response } from 'express';
import { getTopHotAlerts, resolveHotAlert, alertEvents } from '../services/alertCache.service.js';
import { acknowledgeIncident } from '../services/incident.service.js';

const router = Router();

// 1. Первоначальная загрузка активных аварий при открытии страницы
router.get('/hot', async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const alerts = await getTopHotAlerts(limit);
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка получения активных алертов' });
    }
});

// 2. Квитирование (снятие) аварии диспетчером
router.post('/:id/ack', async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Параметр id обязателен' });
    }

    try {
        const result = await acknowledgeIncident(id);
        res.json({ success: true, acknowledgedId: result.id });
    } catch (err) {
        res.status(500).json({ error: 'Не удалось квитировать инцидент' });
    }
});

// 3. Стрим SSE для живых обновлений
router.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write(`data: ${JSON.stringify({ status: 'CONNECTED' })}\n\n`);

    const onNewAlert = (alert: any) => {
        res.write(`event: hot_alert\ndata: ${JSON.stringify(alert)}\n\n`);
    };

    const onResolveAlert = (data: { id: string }) => {
        res.write(`event: alert_resolved\ndata: ${JSON.stringify(data)}\n\n`);
    };

    alertEvents.on('hot_alert', onNewAlert);
    alertEvents.on('alert_resolved', onResolveAlert);

    req.on('close', () => {
        alertEvents.off('hot_alert', onNewAlert);
        alertEvents.off('alert_resolved', onResolveAlert);
        res.end();
    });
});

export default router;