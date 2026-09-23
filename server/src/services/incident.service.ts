import { prisma } from '../db.js';
import { resolveHotAlert } from './alertCache.service.js';
import { IncidentStatus, Prisma } from '@prisma/client';

export interface IncidentFilterQuery {
    status?: IncidentStatus;
    systemObjectId?: number;
    search?: string;
    dateFrom?: string; // ISO-строка, например: '2026-09-20T00:00:00.000Z'
    dateTo?: string;   // ISO-строка, например: '2026-09-21T23:59:59.999Z'
    take?: number;     // Пагинация: сколько записей вернуть
    skip?: number;     // Пагинация: сколько пропустить
}

interface RecordActionParams {
    incidentId: string;
    userId: string;
    decision: string;
    status?: IncidentStatus; // Позволяем передавать финальный статус (CONFIRMED / FALSE_POSITIVE)
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
        take: Number(filters.take) || 50, // <-- ВОТ ЗДЕСЬ: дефолтный лимит 50 записей
        skip: Number(filters.skip) || 0,
        include: {
            systemObject: true,
            actions: {
                orderBy: { createdAt: 'desc' },
                take: 10, // Чтобы не раздувать ответ историей действий
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
    status = IncidentStatus.IN_PROGRESS, // Если статус не передан, ставим IN_PROGRESS
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
                status, // <-- ВОТ ЗДЕСЬ: теперь можно передавать CONFIRMED или FALSE_POSITIVE
            },
        }),
    ]);

    // 2. Только после успешного коммита в Postgres снимаем алерт с горячего экрана
    try {
        await resolveHotAlert(incidentId);
    } catch (cacheError) {
        console.error(`[Cache Error] Failed to resolve hot alert ${incidentId}:`, cacheError);
    }

    return action;
}

export async function acknowledgeIncident(incidentId: string) {
    let updatedIncident = null;

    const existing = await prisma.incident.findUnique({
        where: { id: incidentId },
    });

    if (!existing) {
        // Возвращаем явный null или выбрасываем 404, а не притворяемся успехом
        console.warn(`[ACK] Инцидент ${incidentId} не найден в базе`);
        await resolveHotAlert(incidentId);
        return null;
    }

    updatedIncident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: IncidentStatus.IN_PROGRESS,
        },
    });

    await resolveHotAlert(incidentId);

    return updatedIncident;
}