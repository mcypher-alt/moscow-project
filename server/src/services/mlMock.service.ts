// Типы контрактов
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

export interface TriggerFactor {
  channelId: number;
  reason: string;
}

export interface MLPrediction {
  scenario: string;
  probability: number;
  timeHorizonHours: number;
  recommendation: string;
  triggerFactors: TriggerFactor[];
}

export interface MLInferenceResponse {
  systemObjectId: number;
  evaluatedAt: string;
  predictions: MLPrediction[];
}

/**
 * Имитация ответа от FastAPI ML-сервиса
 */
export async function mockMLInference(payload: MLInferenceRequest): Promise<MLInferenceResponse> {
  // Имитируем небольшую задержку сетевого запроса к нейросети (150-300 мс)
  await new Promise((resolve) => setTimeout(resolve, 200));

  const predictions: MLPrediction[] = [];

  // Ищем каналы с признаками аномалий
  const suspiciousChannels = payload.channels.filter((ch) => {
    return ch.readings.some((r) => {
      const isHighTemp = ch.sensorType?.includes('температур') && (r.numericValue ?? 0) > 60;
      const isSmoke = ch.sensorType?.includes('дым') && r.isAlarm;
      return r.isAlarm || isHighTemp || isSmoke;
    });
  });

  if (suspiciousChannels.length > 0) {
    // 1. Симулируем пожарный риск
    const fireChannel = suspiciousChannels.find(
      (c) => c.systemType.includes('Пожар') || c.sensorType?.includes('температур')
    );

    if (fireChannel) {
      const lastReading = fireChannel.readings[fireChannel.readings.length - 1];
      predictions.push({
        scenario: 'Пожарная опасность (перегрев оборудования)',
        probability: +(0.82 + Math.random() * 0.15).toFixed(2), // 0.82 - 0.97
        timeHorizonHours: 24,
        recommendation: `Направить аварийную бригаду на объект "${payload.dispatcherName}". Проверить зону датчика ${fireChannel.sensorName}.`,
        triggerFactors: [
          {
            channelId: fireChannel.channelId,
            reason: `Резкий рост показаний датчика ${fireChannel.sensorName} (${lastReading?.rawValue ?? 'н/д'}) с признаком тревоги`,
          },
        ],
      });
    }

    // 2. Симулируем охранный инцидент
    const guardChannel = suspiciousChannels.find((c) => c.systemType.includes('Охран'));
    if (guardChannel) {
      predictions.push({
        scenario: 'Несанкционированное проникновение в техпомещение',
        probability: +(0.75 + Math.random() * 0.15).toFixed(2),
        timeHorizonHours: 2,
        recommendation: 'Запросить видеокамеры контура и отправить наряд службы безопасности.',
        triggerFactors: [
          {
            channelId: guardChannel.channelId,
            reason: `Срабатывание охранного датчика ${guardChannel.sensorName} в нерабочее время`,
          },
        ],
      });
    }
  }

  return {
    systemObjectId: payload.systemObjectId,
    evaluatedAt: new Date().toISOString(),
    predictions,
  };
}