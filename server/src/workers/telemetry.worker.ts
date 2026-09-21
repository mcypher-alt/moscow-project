import { prisma } from '../db.js';
import { predictIncidentRisk } from '../services/mlClient.service.js';
import { MLInferenceRequest, SensorChannelBatch } from '../services/mlMock.service.js';
import { saveHotAlert } from '../services/alertCache.service.js';

let isRunning = false;
let lastProcessedEventId: bigint = 0n;

const BATCH_SIZE = 50;
const TICK_INTERVAL_MS = 2000;
const CRITICAL_THRESHOLD = 0.70;

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

  // 2. Безопасная группировка по объектам диспетчеризации
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

  // 3. Формирование контрактов для каждого объекта
  for (const [objectId, objectEvents] of groupedByObject) {
    const firstObjectEvent = objectEvents[0];
    if (!firstObjectEvent) continue;

    const systemObject = firstObjectEvent.channel.systemObject;

    // Группировка событий по датчикам
    const channelsMap = new Map<number, EventItem[]>();
    for (const ev of objectEvents) {
      const channelGroup = channelsMap.get(ev.channelId);
      if (channelGroup) {
        channelGroup.push(ev);
      } else {
        channelsMap.set(ev.channelId, [ev]);
      }
    }

    // Собираем батч каналов через flatMap (исключает undefined)
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

    // 4. Инференс и запись результатов
    try {
      const mlResponse = await predictIncidentRisk(payload);

      // ЕСЛИ АВАРИИ НЕТ — ничего не создаем, идем к следующему объекту
      if (!mlResponse.isIncidentPredicted) {
        continue;
      }

      // ЕСЛИ МОДЕЛЬ СПРОГНОЗИРОВАЛА АВАРИЮ:
      // 1. Создаем бизнес-инцидент в постоянной базе PostgreSQL
      const incident = await prisma.incident.create({
        data: {
          systemObjectId: objectId,
          scenario: mlResponse.incidentType,           // Что сломается
          recommendation: mlResponse.recommendation,   // Что делать диспетчеру
          horizon: mlResponse.horizon,                 // Например: "24-48 часов"
          reason: mlResponse.reason,                   // Причина (триггер)
          status: 'OPEN',                              // Новый необработанный инцидент
        },
      });

      console.log(
        `🚨 [АВАРИЯ] Объект "${systemObject.dispatcherName}": ` +
        `${mlResponse.incidentType} (Срок: ${mlResponse.horizon})`
      );

      // 2. Мгновенно кладем в оперативный кэш Redis/Valkey для вывода на дашборд
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

  /* if (lastProcessedEventId === 0n) {
  const latestEvent = await prisma.eventLog.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  lastProcessedEventId = latestEvent?.id ?? 0n;
  }
  */

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