import { prisma } from '../db.js';
import { resolveHotAlert } from './alertCache.service.js';
import { IncidentStatus } from '@prisma/client';

interface RecordActionParams {
    incidentId: string;
    userId: string;
    decision: string;
    comment?: string;
}

export async function getAllIncidents() {
    return prisma.incident.findMany({
        include: {
        systemObject: true,
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
            status: 'RESOLVED',
        },
        }),
    ]);

    // 2. Только после успешного коммита в Postgres снимаем алерт с горячего экрана
    try {
    await resolveHotAlert(incidentId);
    } catch (cacheError) {
        // Логируем ошибку, но не выбрасываем ее наверх:
        // Действие диспетчера уже надежно сохранено в базе данных!
        console.error(`[Cache Error] Failed to resolve hot alert ${incidentId}:`, cacheError);
    }

    return action;
}

export async function acknowledgeIncident(incidentId: string) {
    // 1. Сначала проверяем и обновляем статус в основной БД
    const updatedIncident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
        status: IncidentStatus.RESOLVED, // или твой enum
        },
    });

    // 2. Только при успехе в БД снимаем из Redis и триггерим SSE
    await resolveHotAlert(incidentId);

    return updatedIncident;
}