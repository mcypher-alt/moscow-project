export interface MLReading {
    recordedAt: string;
    numericValue: number | null;
    rawValue: string | null;
    isAlarm: boolean;
}

export interface MLChannelPayload {
    channelId: number;
    systemTag: string;
    sensorName: string;
    systemType: string;
    sensorType: string;
    readings: MLReading[];
}

export interface MLPredictRequest {
    systemObjectId: number;
    dispatcherName: string;
    timeHorizonHours: number;
    timestamp: string;
    channels: MLChannelPayload[];
}

export interface MLTriggerFactor {
    channelId: number;
    reason: string;
}

export interface MLPredictionItem {
    scenario: string;
    probability: number;
    timeHorizonHours: number;
    recommendation: string;
    triggerFactors?: MLTriggerFactor[];
}

export interface MLPredictResponse {
    systemObjectId: number;
    evaluatedAt: string;
    predictions: MLPredictionItem[];
}