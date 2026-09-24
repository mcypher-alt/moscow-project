// src/routes/objects.router.ts (или в твоем контроллере)
import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// Словарь видов объектов для читаемого вывода
const OBJECT_KIND_LABELS: Record<string, string> = {
    controlHouse: 'Диспетчерский пункт / Узел управления',
    guardObject: 'Охранно-технический комплекс',
    substation: 'Трансформаторная / Электроподстанция',
    collector: 'Инженерный коммуникационный коллектор',
};

router.get('/', async (req, res) => {
    try {
        const systemObjects = await prisma.systemObject.findMany({
            orderBy: { id: 'asc' },
            include: {
                // Подтягиваем только последний открытый инцидент для статуса риска
                incidents: {
                    where: {
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                // Считаем количество датчиков и подузлов без выгрузки всех записей
                _count: {
                    select: {
                        channels: true,
                        children: true,
                    },
                },
            },
        });

        const response = systemObjects.map((obj) => {
            const activeIncident = obj.incidents[0] || null;

            return {
                id: obj.id,
                name: obj.dispatcherName,
                dispatcherName: obj.dispatcherName,
                level: obj.level,
                objectKind: obj.objectKind,
                kindLabel: OBJECT_KIND_LABELS[obj.objectKind] || obj.objectKind,
                status: activeIncident ? 'CRITICAL' : 'NORMAL',
                activeIncident: activeIncident ? activeIncident.scenario : null,
                horizon: activeIncident ? activeIncident.horizon : null,
                incident: activeIncident
                    ? {
                        id: activeIncident.id,
                        scenario: activeIncident.scenario,
                        horizon: activeIncident.horizon,
                        reason: activeIncident.reason,
                        recommendation: activeIncident.recommendation,
                    }
                    : null,
                sensorsCount: obj._count.channels,
                childrenCount: obj._count.children,
            };
        });

        res.json(response);
    } catch (error) {
        console.error('Ошибка получения списка объектов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const objectId = Number(req.params.id);
        if (isNaN(objectId)) {
        return res.status(400).json({ error: 'Некорректный ID объекта' });
        }

        const systemObject = await prisma.systemObject.findUnique({
        where: { id: objectId },
        include: {
            // 1. Подтягиваем родителя (чтобы понимать, в какой узел входит)
            parent: {
            select: {
                id: true,
                dispatcherName: true,
                objectKind: true,
            },
            },
            // 2. Дочерние объекты (если это головной пункт)
            children: {
            select: {
                id: true,
                dispatcherName: true,
                level: true,
            },
            },
            // 3. Все датчики объекта
            channels: true,
            // 4. Активный инцидент
            incidents: {
            where: {
                status: { in: ['OPEN', 'IN_PROGRESS'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            },
        },
        });

        if (!systemObject) {
        return res.status(404).json({ error: 'Объект не найден' });
        }

        const activeIncident = systemObject.incidents[0] || null;

        // Собираем DTO для фронтенда
        const response = {
        id: systemObject.id,
        name: systemObject.dispatcherName,
        level: systemObject.level,
        objectKind: systemObject.objectKind,
        kindLabel: OBJECT_KIND_LABELS[systemObject.objectKind] || systemObject.objectKind,
        parent: systemObject.parent
            ? {
                id: systemObject.parent.id,
                name: systemObject.parent.dispatcherName,
            }
            : null,
        childrenCount: systemObject.children.length,
        status: activeIncident ? 'CRITICAL' : 'NORMAL',
        incident: activeIncident
            ? {
                id: activeIncident.id,
                scenario: activeIncident.scenario,
                horizon: activeIncident.horizon,
                reason: activeIncident.reason,
                recommendation: activeIncident.recommendation,
            }
            : null,
        sensors: systemObject.channels.map((ch) => ({
            id: ch.id,
            systemTag: ch.systemTag,
            name: ch.sensorName || ch.systemTag,
            systemType: ch.systemType,
            sensorType: ch.sensorType,
        })),
        };

        res.json(response);
    } catch (error) {
        console.error('Ошибка получения объекта:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

export default router;