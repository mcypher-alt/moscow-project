// src/services/mlMock.service.ts

// --- Входные контракты (остаются прежними для сбора телеметрии) ---

export interface TelemetryReading {
  recordedAt: string;
  numericValue: number | null;
  rawValue: string | null;
  isAlarm: boolean;
}

export interface SensorChannelBatch {
  channelId: number;
  systemTag: string;
  sensorName: string;
  systemType: string;
  sensorType: string | null;
  readings: TelemetryReading[];
}

export interface MLInferenceRequest {
  systemObjectId: number;
  dispatcherName: string;
  timeHorizonHours: number;
  timestamp: string;
  channels: SensorChannelBatch[];
}

// --- Новый целевой контракт ответа ML-сервиса ---

export interface MLNegativeResponse {
  isIncidentPredicted: false;
  systemObjectId: number;
  evaluatedAt: string;
}

export interface MLPositiveResponse {
  isIncidentPredicted: true;
  systemObjectId: number;
  evaluatedAt: string;
  probability: number;
  incidentType: string;    // Название аварии/сбоя
  horizon: string;         // Срок прогноза (например, "24-48 часов")
  reason: string;          // Физическая причина или триггер
  recommendation: string;  // Инструкция для диспетчера
  channelId?: number | null; // Датчик, вызвавший подозрение
}

export type MLInferenceResponse = MLNegativeResponse | MLPositiveResponse;

/**
 * Имитация ответа от FastAPI ML-сервиса под требования бизнес-контракта
 */
export async function mockMLInference(payload: MLInferenceRequest): Promise<MLInferenceResponse> {
  // Имитация сетевой задержки обращения к Python-сервису (150-250 мс)
  await new Promise((resolve) => setTimeout(resolve, 200));

  const evaluatedAt = new Date().toISOString();

  // 1. Поиск аномальных показаний по каналам
  const suspiciousChannels = payload.channels.filter((ch) => {
    return ch.readings.some((r) => {
      const isHighTemp = (ch.sensorType?.toLowerCase().includes('температур') ||
                ch.sensorType?.toLowerCase().includes('temp')) && (r.numericValue ?? 0) > 60;
      const isSmoke = (ch.sensorType?.toLowerCase().includes('дым') ||
                ch.sensorType?.toLowerCase().includes('smoke')) && r.isAlarm;
      return r.isAlarm || isHighTemp || isSmoke;
    });
  });

  // Если всё работает штатно — возвращаем отрицательный вердикт без лишних данных
  if (suspiciousChannels.length === 0) {
    return {
      isIncidentPredicted: false,
      systemObjectId: payload.systemObjectId,
      evaluatedAt,
    };
  }

  // 2. Симуляция пожарной опасности / перегрева
  const fireChannel = suspiciousChannels.find(
    (c) => c.systemType.includes('Пожар') || c.sensorType?.toLowerCase().includes('температур')
  );

  if (fireChannel) {
    const lastReading = fireChannel.readings[fireChannel.readings.length - 1];
    return {
      isIncidentPredicted: true,
      systemObjectId: payload.systemObjectId,
      evaluatedAt,
      probability: 0.92,
      incidentType: 'Пожарная опасность (перегрев оборудования)',
      horizon: '24-48 часов',
      reason: `Резкий рост показаний датчика "${fireChannel.sensorName}" (${lastReading?.rawValue ?? 'н/д'}) с флагом тревоги`,
      recommendation: `Направить аварийную бригаду на объект "${payload.dispatcherName}". Проверить контур датчика ${fireChannel.sensorName}.`,
      channelId: fireChannel.channelId,
    };
  }

  // 3. Симуляция охранного инцидента
  const guardChannel = suspiciousChannels.find((c) => c.systemType.includes('Охран'));

  if (guardChannel) {
    return {
      isIncidentPredicted: true,
      systemObjectId: payload.systemObjectId,
      evaluatedAt,
      probability: 0.78,
      incidentType: 'Несанкционированное проникновение в техпомещение',
      horizon: '2-4 часа',
      reason: `Срабатывание охранного датчика "${guardChannel.sensorName}" во внерабочее время`,
      recommendation: 'Запросить видеопоток камер контура и направить наряд службы безопасности.',
      channelId: guardChannel.channelId,
    };
  }

  // Дефолтный ответ при отсутствии явного совпадения по типам инцидентов
  return {
    isIncidentPredicted: false,
    systemObjectId: payload.systemObjectId,
    evaluatedAt,
  };
}