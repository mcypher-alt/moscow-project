import { prisma } from '../db.js';
import { predictIncidentRisk } from '../services/mlClient.service.js';
import { MLInferenceRequest, SensorChannelBatch } from '../services/mlMock.service.js';
import { saveHotAlert } from '../services/alertCache.service.js';

let isRunning = false;
let lastProcessedEventId: bigint = 0n;

const BATCH_SIZE = 50;
const TICK_INTERVAL_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function processTelemetryCycle() {
  // 1. Выбираем события телеметрии с подтягиванием связанных моделей
  const events = await prisma.eventLog.findMany({
    where: {
      id: { gt: lastProcessedEventId },
    },
    take: BATCH_SIZE,
    orderBy: { id: 'asc' },
    include: {
      channel: {
        include: {
          systemObject: true,
        },
      },
    },
  });

  if (events.length === 0) {
    return;
  }

  // Безопасное чтение последнего элемента батча
  const lastEvent = events[events.length - 1];
  if (lastEvent) {
    lastProcessedEventId = lastEvent.id;
  }

  // 2. Группировка событий по объектам диспетчеризации
  type EventItem = (typeof events)[number];
  const groupedByObject = new Map<number, EventItem[]>();

  for (const event of events) {
    const objId = event.channel.systemObjectId;
    const currentGroup = groupedByObject.get(objId);

    if (currentGroup) {
      currentGroup.push(event);
    } else {
      groupedByObject.set(objId, [event]);
    }
  }

  // 3. Формирование пакетов каналов и вызов ML-инференса для каждого объекта
  for (const [objectId, objectEvents] of groupedByObject) {
    const firstObjectEvent = objectEvents[0];
    if (!firstObjectEvent) continue;

    const systemObject = firstObjectEvent.channel.systemObject;

    // Группировка событий по датчикам (каналам) объекта
    const channelsMap = new Map<number, EventItem[]>();
    for (const ev of objectEvents) {
      const channelGroup = channelsMap.get(ev.channelId);
      if (channelGroup) {
        channelGroup.push(ev);
      } else {
        channelsMap.set(ev.channelId, [ev]);
      }
    }

    const channelsPayload: SensorChannelBatch[] = Array.from(channelsMap.entries()).flatMap(
      ([chId, chEvents]) => {
        const firstChEvent = chEvents[0];
        if (!firstChEvent) return [];

        const meta = firstChEvent.channel;
        return [
          {
            channelId: chId,
            systemTag: meta.systemTag,
            sensorName: meta.sensorName,
            systemType: meta.systemType,
            sensorType: meta.sensorType,
            readings: chEvents.map((e) => ({
              recordedAt: e.recordedAt.toISOString(),
              numericValue: e.numericValue,
              rawValue: e.rawValue,
              isAlarm: e.isAlarm,
            })),
          },
        ];
      }
    );

    const payload: MLInferenceRequest = {
      systemObjectId: objectId,
      dispatcherName: systemObject.dispatcherName,
      timeHorizonHours: 24,
      timestamp: new Date().toISOString(),
      channels: channelsPayload,
    };

    try {
      // 4. Проверяем, есть ли уже незакрытый инцидент по этому объекту
      const activeIncident = await prisma.incident.findFirst({
        where: {
          systemObjectId: objectId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      const mlResponse = await predictIncidentRisk(payload);

      // Если аномалий нет — идем к следующему объекту
      if (!mlResponse.isIncidentPredicted) {
        continue;
      }

      // Определяем датчик, вызвавший тревогу
      const triggeredChannel = mlResponse.channelId
        ? channelsPayload.find((c) => c.channelId === mlResponse.channelId)
        : null;

      const sensorLabel = triggeredChannel
        ? `датчик "${triggeredChannel.sensorName}" (#${triggeredChannel.channelId})`
        : mlResponse.channelId
        ? `датчик #${mlResponse.channelId}`
        : null;

      // =========================================================================
      // ВАРИАНТ А: Объект уже зафиксирован (АГРЕГАЦИЯ / ДОПОЛНЕНИЕ ПРИЧИНЫ)
      // =========================================================================
      if (activeIncident) {
        // Если датчик еще не упомянут в причине — дописываем его, не плодя дубли
        if (sensorLabel && !activeIncident.reason.includes(sensorLabel)) {
          const updatedReason = `${activeIncident.reason}; также сработал ${sensorLabel}`;

          // 1. Обновляем причину в базе данных
          await prisma.incident.update({
            where: { id: activeIncident.id },
            data: { reason: updatedReason },
          });

          // 2. Если инцидент еще в статусе OPEN — обновляем горячую карточку в Redis
          if (activeIncident.status === 'OPEN') {
            try {
              await saveHotAlert({
                id: activeIncident.id,
                systemObjectId: objectId,
                dispatcherName: systemObject.dispatcherName,
                scenario: activeIncident.scenario,
                recommendation: activeIncident.recommendation,
                horizon: activeIncident.horizon,
                reason: updatedReason,
              });
            } catch (cacheErr) {
              console.error('Ошибка обновления алерта в Valkey/Redis:', cacheErr);
            }
          }

          console.log(
            `🔄 [АГРЕГАЦИЯ] Объект "${systemObject.dispatcherName}": дополнен ${sensorLabel}`
          );
        }

        // Пропускаем создание нового инцидента
        continue;
      }

      // =========================================================================
      // ВАРИАНТ Б: Новый инцидент (ПЕРВИЧНОЕ СОЗДАНИЕ)
      // =========================================================================
      const incident = await prisma.incident.create({
        data: {
          systemObjectId: objectId,
          scenario: mlResponse.incidentType,
          recommendation: mlResponse.recommendation,
          horizon: mlResponse.horizon,
          reason: mlResponse.reason,
          status: 'OPEN',
        },
      });

      console.log(
        `🚨 [НОВАЯ АВАРИЯ] Объект "${systemObject.dispatcherName}": ${mlResponse.incidentType} (Срок: ${mlResponse.horizon})`
      );

      // Кладем в оперативный кэш Redis/Valkey
      try {
        await saveHotAlert({
          id: incident.id,
          systemObjectId: objectId,
          dispatcherName: systemObject.dispatcherName,
          scenario: mlResponse.incidentType,
          recommendation: mlResponse.recommendation,
          horizon: mlResponse.horizon,
          reason: mlResponse.reason,
        });
      } catch (cacheErr) {
        console.error('Ошибка сохранения алерта в Valkey/Redis:', cacheErr);
      }
    } catch (err) {
      console.error(`Ошибка при инференсе объекта ${objectId}:`, err);
    }
  }
}

export async function startTelemetryWorker() {
  if (isRunning) return;
  isRunning = true;
  console.log('🚀 Фоновый воркер телеметрии запущен');

  while (isRunning) {
    try {
      await processTelemetryCycle();
    } catch (error) {
      console.error('Ошибка в такте воркера телеметрии:', error);
    }
    await sleep(TICK_INTERVAL_MS);
  }
}

export function stopTelemetryWorker() {
  isRunning = false;
  console.log('Фоновый воркер остановлен');
}