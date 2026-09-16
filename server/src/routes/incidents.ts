import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticateJwt, requireRoles } from '../middlewares/auth.js';
import { IncidentService } from '../services/incident.service.js';
import { getTopHotAlerts } from '../services/alertCache.service.js';

const router = Router();

// Получение списка инцидентов
router.get(
    '/incidents',
    authenticateJwt,
    requireRoles(Role.DISPATCHER, Role.ANALYST, Role.ADMIN),
    async (_req: Request, res: Response) => {
        try {
            const incidents = await IncidentService.getAllIncidents();
            return res.json(incidents);
        } catch (error) {
            return res.status(500).json({ error: 'Ошибка получения инцидентов' });
        }
    }
);

// Фиксация действия диспетчера по инциденту
router.post(
    '/incidents/:id/action',
    authenticateJwt,
    requireRoles(Role.DISPATCHER, Role.ADMIN),
    async (req: Request<{ id: string }>, res: Response) => {
        const { id: incidentId } = req.params;
        const { decision, comment } = req.body;

        if (!decision) {
            return res.status(400).json({ error: 'Решение обязательно для заполнения' });
        }

        try {
            const action = await IncidentService.recordDispatcherAction({
                incidentId,
                userId: req.user!.id,
                decision,
                comment,
            });

            return res.status(201).json(action);
        } catch (error) {
            return res.status(500).json({ error: 'Ошибка сохранения действия' });
        }
    }
);

router.get('/alerts/hot', async (_req, res) => {
    try {
        const alerts = await getTopHotAlerts(10);
        res.json({ count: alerts.length, alerts });
    } catch (err) {
        res.status(500).json({ error: 'Не удалось получить алерты из кэша' });
    }
});

export default router;