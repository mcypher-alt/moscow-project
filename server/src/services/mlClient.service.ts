// src/services/mlClient.service.ts
import axios from 'axios';
import { mockMLInference, MLInferenceRequest, MLInferenceResponse } from './mlMock.service.js';

const USE_MOCK = process.env.USE_ML_MOCK === 'true';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000/predict';

export async function predictIncidentRisk(payload: MLInferenceRequest): Promise<MLInferenceResponse> {
    if (USE_MOCK) {
        return mockMLInference(payload);
    }

    const { data } = await axios.post<MLInferenceResponse>(ML_SERVICE_URL, payload, {
        timeout: 5000,
    });
    return data;
}