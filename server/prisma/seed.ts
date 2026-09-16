import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { prisma } from '../src/db.js';

const DATA_DIR = path.join(process.cwd(), 'prisma', 'data');

async function main() {
    console.log('Начало заполнения базы данных...');

    // 1. Заливаем SystemObject (95 записей)
    const objectsPath = path.join(DATA_DIR, 'справочник_объектов_диспетчер.csv');
    if (!fs.existsSync(objectsPath)) {
        throw new Error(`Файл не найден: ${objectsPath}`);
    }

    const objectsRaw = fs.readFileSync(objectsPath, 'utf-8');
    const objectRecords: any[] = parse(objectsRaw, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    const existingIds = new Set(objectRecords.map((r) => parseInt(r['ид_объект'], 10)));

    // Сортировка по уровню (1 -> 2 -> 3), чтобы родительские узлы создавались раньше дочерних
    objectRecords.sort(
        (a, b) => parseInt(a['иерархия_уровень'], 10) - parseInt(b['иерархия_уровень'], 10)
    );

    for (const row of objectRecords) {
        const id = parseInt(row['ид_объект'], 10);
        const parentRaw = parseInt(row['родитель'], 10);
        // Защита от несуществующего родителя 3831 у корня
        const parentId = existingIds.has(parentRaw) ? parentRaw : null;

        await prisma.systemObject.upsert({
            where: { id },
            update: {},
            create: {
                id,
                level: parseInt(row['иерархия_уровень'], 10),
                objectKind: row['вид_объекта'],
                dispatcherName: row['диспетчерское_название_объекта'],
                parentId,
            },
        });
    }
    console.log(`✓ Залито объектов: ${objectRecords.length}`);

    // 2. Заливаем SensorChannel (11 485 записей)
    const channelsPath = path.join(DATA_DIR, 'справочник_каналов_датчиков.csv');
    if (!fs.existsSync(channelsPath)) {
        throw new Error(`Файл не найден: ${channelsPath}`);
    }

    const channelsRaw = fs.readFileSync(channelsPath, 'utf-8');
    const channelRecords: any[] = parse(channelsRaw, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    const channelsData = channelRecords.map((row) => ({
        id: parseInt(row['ид_канала_данных'], 10),
        systemTag: row['тег_инженерной_системы'],
        sensorName: row['название_датчика'],
        systemType: row['тип_инж_системы'],
        sensorType: row['тип_датчика'] || null,
        systemObjectId: parseInt(row['ид_объект'], 10),
    }));

    await prisma.sensorChannel.createMany({
        data: channelsData,
        skipDuplicates: true,
    });
    console.log(`✓ Залито каналов датчиков: ${channelsData.length}`);

    // 3. Заливаем первые 1 000 строк журнала событий для начальной истории
    const eventsPath = path.join(DATA_DIR, 'журнал_событий_пример.csv');
    if (fs.existsSync(eventsPath)) {
        const eventsRaw = fs.readFileSync(eventsPath, 'utf-8');
        const eventRecords: any[] = parse(eventsRaw, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            to: 1000,
        });

        const eventsData = eventRecords.map((row) => {
            const raw = row['значение_датчика'];
            const num = parseFloat(raw);
            return {
                id: BigInt(row['ид_события']),
                channelId: parseInt(row['ид_канала_данных'], 10),
                recordedAt: new Date(`${row['дата']}T${row['время']}Z`),
                isAlarm: row['тревожное'].toLowerCase() === 'true',
                rawValue: raw,
                numericValue: isNaN(num) ? null : num,
            };
        });

        await prisma.eventLog.createMany({
            data: eventsData,
            skipDuplicates: true,
        });
        console.log(`✓ Залито начальных событий: ${eventsData.length}`);
    }
}

main()
    .catch((e) => {
        console.error('Ошибка сида:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });