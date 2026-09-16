import { prisma } from '../db.js';

interface RecordActionParams {
    incidentId: string;
    userId: string;
    decision: string;
    comment?: string;
}

export class IncidentService {
    /**
     * Получение списка инцидентов с привязанными системными объектами
     */
    static async getAllIncidents() {
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
     * Фиксация реакции диспетчера на инцидент
     */
    static async recordDispatcherAction({
        incidentId,
        userId,
        decision,
        comment,
    }: RecordActionParams) {
        return prisma.dispatcherAction.create({
            data: {
                incidentId,
                userId,
                decision,
                comment,
            },
        });
    }
}