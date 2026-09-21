import { prisma } from '../db.js';
import { resolveHotAlert } from './alertCache.service.js';
import { IncidentStatus, Prisma } from '@prisma/client';

export interface IncidentFilterQuery {
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
}: RecordActionParams) {
    // 1. Атомарно фиксируем действие и меняем статус инцидента
    const [action] = await prisma.$transaction([
        prisma.dispatcherAction.create({
            data: {
                incidentId,
                userId,
                decision,
                comment,
            },
        }),
        prisma.incident.update({
            where: { id: incidentId },
            data: {
                status: 'IN_PROGRESS',
            },
        }),
    ]);

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

export async function acknowledgeIncident(incidentId: string) {
    let updatedIncident = null;

    // 1. Проверяем наличие записи в Postgres перед обновлением
    const existing = await prisma.incident.findUnique({
        where: { id: incidentId },
    });

    if (existing) {
        updatedIncident = await prisma.incident.update({
            where: { id: incidentId },
            data: {
                status: 'IN_PROGRESS', // Переводим в статус "В работе"
            },
        });
    } else {
        console.warn(`[ACK] Инцидент ${incidentId} отсутствовал в PostgreSQL, снят только из Redis`);
    }

    // 2. Снимаем горящий алерт из Redis и рассылаем SSE
    await resolveHotAlert(incidentId);

    return updatedIncident ?? { id: incidentId, status: 'IN_PROGRESS' };
}