import { Router, Request, Response } from 'express';
import { alertEvents } from '../services/alertCache.service.js';
import { recordDispatcherAction } from '../services/incident.service.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.js';
import { Role } from '@prisma/client';
import { prisma } from '../db.js';

const router = Router();
router.use(authenticateJwt);

// 1. Первоначальная загрузка активных аварий при открытии страницы
router.get('/hot', async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit ?? 10);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ error: 'Invalid limit' });
        // Read durable state so Redis restarts cannot hide unresolved incidents.
        const incidents = await prisma.incident.findMany({ where: { status: 'OPEN' }, take: limit,
            orderBy: { createdAt: 'desc' }, include: { systemObject: true } });
        const alerts = incidents.map(incident => ({ ...incident, dispatcherName: incident.systemObject.dispatcherName }));
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка получения активных алертов' });
    }
});

// 2. Квитирование (снятие) аварии диспетчером
router.post('/:id/ack', requireRoles(Role.DISPATCHER, Role.ADMIN), async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Параметр id обязателен' });
    }

    try {
        await recordDispatcherAction({ incidentId: id, userId: req.user!.id, decision: 'ACKNOWLEDGE' });
        res.json({ success: true, acknowledgedId: id });
    } catch (err) {
        if (err instanceof Error && err.message === 'INCIDENT_CLOSED') return res.status(409).json({ error: 'Инцидент уже закрыт' });
        if (err instanceof Error && err.message === 'INCIDENT_NOT_FOUND') return res.status(404).json({ error: 'Инцидент не найден' });
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
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);

    req.on('close', () => {
        clearInterval(heartbeat);
        alertEvents.off('hot_alert', onNewAlert);
        alertEvents.off('alert_resolved', onResolveAlert);
        res.end();
    });
});

export default router;
