import { Router, Request, Response } from 'express';
import { Role, IncidentStatus } from '@prisma/client';
import { authenticateJwt, requireRoles } from '../middlewares/auth.js';
import * as IncidentService from '../services/incident.service.js';

const router = Router();

// Получение списка инцидентов с фильтрацией
router.get(
    '/',
    authenticateJwt,
    requireRoles(Role.DISPATCHER, Role.ADMIN),
    async (req: Request, res: Response) => {
        try {
            const { status, systemObjectId, search, dateFrom, dateTo } = req.query;

            const incidents = await IncidentService.getAllIncidents({
                status: status ? (String(status) as IncidentStatus) : undefined,
                systemObjectId: systemObjectId ? Number(systemObjectId) : undefined,
                search: search ? String(search) : undefined,
                dateFrom: dateFrom ? String(dateFrom) : undefined,
                dateTo: dateTo ? String(dateTo) : undefined,
            });

            return res.json(incidents);
        } catch (err) {
            console.error('Ошибка при получении инцидентов:', err);
            return res.status(500).json({ error: 'Не удалось загрузить инциденты' });
        }
    }
);

// Фиксация действия диспетчера по инциденту
router.post(
    '/:id/action',
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
            console.error('Ошибка сохранения действия диспетчера:', error);
            return res.status(500).json({ error: 'Ошибка сохранения действия' });
        }
    }
);

export default router;