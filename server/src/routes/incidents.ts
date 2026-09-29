import { Router, Request, Response } from 'express';
import { Role, IncidentStatus } from '@prisma/client';
import { authenticateJwt, requireRoles } from '../middlewares/auth.js';
import * as IncidentService from '../services/incident.service.js';
import { decisions, reasons } from '../services/decisions.js';

const router = Router();

// Получение списка инцидентов с фильтрацией
router.get(
    '/',
    authenticateJwt,
    requireRoles(Role.DISPATCHER, Role.ADMIN, Role.ANALYST),
    async (req: Request, res: Response) => {
        try {
            const { status, systemObjectId, search, dateFrom, dateTo } = req.query;
            const offset = Number(req.query.offset ?? 0);
            if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ error: 'Invalid offset' });
            if ((status && !Object.values(IncidentStatus).includes(String(status) as IncidentStatus)) ||
                (systemObjectId && (!Number.isSafeInteger(Number(systemObjectId)) || Number(systemObjectId) < 1)) ||
                [dateFrom, dateTo].some(v => v && !Number.isFinite(Date.parse(String(v)))) ||
                (dateFrom && dateTo && Date.parse(String(dateFrom)) > Date.parse(String(dateTo)))) {
                return res.status(400).json({ error: 'Некорректные фильтры' });
            }

            const incidents = await IncidentService.getAllIncidents({
                offset,
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
        const { decision, comment, reasonCode } = req.body;

        if (typeof decision !== 'string' || !Object.hasOwn(decisions, decision) ||
            (comment !== undefined && (typeof comment !== 'string' || comment.length > 10000)) ||
            !reasons.includes(reasonCode) ||
            (['OTHER', 'INSPECTION_COMPLETED', 'REPAIR_COMPLETED'].includes(decision) && !comment?.trim())) {
            return res.status(400).json({ error: 'Решение обязательно для заполнения' });
        }

        try {
            const action = await IncidentService.recordDispatcherAction({
                incidentId,
                userId: req.user!.id,
                decision,
                comment,
                reasonCode,
            });

            return res.status(201).json(action);
        } catch (error) {
            if (error instanceof Error && error.message === 'INCIDENT_CLOSED') return res.status(409).json({ error: 'Инцидент уже закрыт' });
            if (error instanceof Error && error.message === 'INCIDENT_NOT_FOUND') return res.status(404).json({ error: 'Инцидент не найден' });
            console.error('Ошибка сохранения действия диспетчера:', error);
            return res.status(500).json({ error: 'Ошибка сохранения действия' });
        }
    }
);

export default router;
