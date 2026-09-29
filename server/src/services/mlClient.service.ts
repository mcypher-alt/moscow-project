import axios from 'axios';
import type { MLInferenceRequest } from './mlMock.service.js';
export interface Prediction {
  systemObjectId: number; evaluatedAt: string; isIncidentPredicted: boolean;
  probability: number; threshold: number; modelVersion: string;
  horizon: string; horizonHours: number; incidentType: string; reason: string; recommendation: string;
}
export async function predictIncidentRisk(payload: MLInferenceRequest & { objectKind: string; historyStart: string; hourly?: Record<string, unknown>[] }): Promise<Prediction> {
  const base = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const url = base.endsWith('/predict') ? base : `${base.replace(/\/$/, '')}/predict`;
  const { data } = await axios.post<Prediction>(url, payload, { timeout: 240000 });
  if (data.systemObjectId !== payload.systemObjectId || !Number.isFinite(Date.parse(data.evaluatedAt)) ||
      Date.parse(data.evaluatedAt) !== Date.parse(payload.timestamp) ||
      typeof data.isIncidentPredicted !== 'boolean' ||
      !Number.isFinite(data.probability) || data.probability < 0 || data.probability > 100 ||
      !Number.isFinite(data.threshold) || data.threshold < 0 || data.threshold > 100 ||
      data.isIncidentPredicted !== (data.probability >= data.threshold) ||
      data.horizonHours !== payload.timeHorizonHours ||
      ![data.modelVersion, data.horizon, data.incidentType, data.reason, data.recommendation].every(v => typeof v === 'string' && v.length > 0)) {
    throw new Error('Invalid ML response');
  }
  return data;
}
