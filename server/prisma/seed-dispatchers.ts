import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // или bcrypt

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Запуск сида диспетчеров...');

    // Хешируем пароль (замени на нужный пароль)
    const passwordHash = await bcrypt.hash('admin123', 10);

    const dispatcher = await prisma.user.upsert({
        where: { email: 'dispatcher@test.ru' }, // Уникальное поле поиска
        update: {
            password: passwordHash, // Обновит пароль, если юзер уже есть
        },
        create: {
            email: 'dispatcher@test.ru',
            name: 'Иванов А. А.',
            role: 'DISPATCHER', // Проверь регистр в enum Role в schema.prisma
            password: passwordHash,
        },
    });

    console.log('✅ Диспетчер успешно создан / обновлен:', dispatcher);
}

main()
    .catch((e) => {
        console.error('❌ Ошибка при сиде диспетчера:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });