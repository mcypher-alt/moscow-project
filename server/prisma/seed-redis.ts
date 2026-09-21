import { prisma } from '../src/db.js';
import { redis } from '../src/redis.js';
import { saveHotAlert } from '../src/services/alertCache.service.js';

async function seedRedis() {
    console.log('🌱 Очистка и синхронное сидирование Postgres + Redis...');

    // 1. Очищаем Redis
    const existingAlertKeys = await redis.keys('alert:*');
    if (existingAlertKeys.length > 0) {
        await redis.del(...existingAlertKeys);
    }
    await redis.del('active_alerts');

    // 2. Получаем существующий объект из базы (или берем id: 1)
    const systemObject = await prisma.systemObject.findFirst();
    if (!systemObject) {
        console.error('❌ Ошибка: сначала запустите seed:csv, чтобы в базе появились объекты!');
        process.exit(1);
    }

    const demoAlertsData = [
        {
        systemObjectId: systemObject.id,
        dispatcherName: systemObject.dispatcherName,
        scenario: 'Пожарная опасность (перегрев оборудования)',
        horizon: '2-4 часа',
        reason: 'Температура на датчике ТР-1 превысила 85°C при падении уровня охлаждающей жидкости',
        recommendation: 'Направить дежурную бригаду. Проверить контур масляного охлаждения трансформатора.',
        },
        {
        systemObjectId: systemObject.id,
        dispatcherName: systemObject.dispatcherName,
        scenario: 'Утечка газа / критическое падение давления',
        horizon: '30-60 минут',
        reason: 'Срабатывание датчика загазованности ДЗ-2 и аномальный перепад давления на редукторе',
        recommendation: 'Перекрыть запорную арматуру секции 3. Оповестить аварийную газовую службу.',
        },
    ];

    for (const item of demoAlertsData) {
        // Сначала создаем запись в PostgreSQL
        const incident = await prisma.incident.create({
        data: {
            systemObjectId: item.systemObjectId,
            scenario: item.scenario,
            horizon: item.horizon,
            reason: item.reason,
            recommendation: item.recommendation,
            status: 'OPEN',
        },
        });

        // Затем пушим в Redis с настоящим ID из базы
        await saveHotAlert({
        id: incident.id,
        systemObjectId: item.systemObjectId,
        dispatcherName: item.dispatcherName,
        scenario: item.scenario,
        horizon: item.horizon,
        reason: item.reason,
        recommendation: item.recommendation,
        });

        console.log(`  ➕ Создан инцидент [${incident.id.slice(0, 8)}] и отправлен в Redis`);
    }

    console.log('✅ Сидирование успешно завершено');
    await redis.quit();
    await prisma.$disconnect();
}

seedRedis().catch((err) => {
    console.error('❌ Ошибка сидирования:', err);
    process.exit(1);
});