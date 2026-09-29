import { prisma } from '../db.js';
import { resolveHotAlert } from './alertCache.service.js';
import { IncidentStatus, Prisma } from '@prisma/client';
import { decisions } from './decisions.js';

export interface IncidentFilterQuery {
    offset?: number;
    status?: IncidentStatus;
    systemObjectId?: number;
    search?: string;
    dateFrom?: string; // ISO-строка, например: '2026-09-20T00:00:00.000Z'
    dateTo?: string;   // ISO-строка, например: '2026-09-21T23:59:59.999Z'
}

interface RecordActionParams {
    incidentId: string;
    userId: string;
    decision: string;
    comment?: string;
    reasonCode?: string;
}

/**
 * Получение журнала инцидентов с поддержкой фильтрации
 */
export async function getAllIncidents(filters: IncidentFilterQuery = {}) {
    const where: Prisma.IncidentWhereInput = {};

    // 1. Фильтр по статусу (OPEN, IN_PROGRESS, CONFIRMED, FALSE_POSITIVE)
    if (filters.status) {
        where.status = filters.status;
    }

    // 2. Фильтр по конкретному объекту / узлу
    if (filters.systemObjectId) {
        where.systemObjectId = Number(filters.systemObjectId);
    }

    // 3. Фильтр по временному диапазону создания
    if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        };
    }

    // 4. Полнотекстовый поиск по сценарию, причине или диспетчерскому названию объекта
    if (filters.search && filters.search.trim()) {
        const query = filters.search.trim();
        where.OR = [
            { scenario: { contains: query, mode: 'insensitive' } },
            { reason: { contains: query, mode: 'insensitive' } },
            {
                systemObject: {
                    dispatcherName: { contains: query, mode: 'insensitive' },
                },
            },
        ];
    }

    return prisma.incident.findMany({
        take: 100,
        skip: filters.offset ?? 0,
        where,
        include: {
            systemObject: true,
            actions: {
                orderBy: { createdAt: 'desc' },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}

/**
 * Фиксация реакции диспетчера:
 * 1. Сохранение действия в БД
 * 2. Снятие тревоги из Redis и уведомление фронтенда через SSE
 */
export async function recordDispatcherAction({
    incidentId,
    userId,
    decision,
    comment,
    reasonCode,
}: RecordActionParams) {
    const status = decisions[decision];
    if (!status) throw new Error('INVALID_DECISION');
    // 1. Атомарно фиксируем действие и меняем статус инцидента
    const action = await prisma.$transaction(async tx => {
        const changed = await tx.incident.updateMany({
            where: { id: incidentId, status: { in: ['OPEN', 'IN_PROGRESS', 'CONFIRMED'] } }, data: { status },
        });
        if (!changed.count) {
            const existing = await tx.incident.findUnique({ where: { id: incidentId } });
            throw new Error(existing ? 'INCIDENT_CLOSED' : 'INCIDENT_NOT_FOUND');
        }
        return tx.dispatcherAction.create({ data: { incidentId, userId, decision, comment, reasonCode } });
    });

    // 2. Только после успешного коммита в Postgres снимаем алерт с горячего экрана
    try {
        await resolveHotAlert(incidentId);
    } catch (cacheError) {
        // Логируем ошибку, но не прерываем выполнение:
        // Действие диспетчера уже надежно зафиксировано в PostgreSQL!
        console.error(`[Cache Error] Failed to resolve hot alert ${incidentId}:`, cacheError);
    }

    return action;
}
