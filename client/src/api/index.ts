import axios from 'axios';
import type {
    User,
    LoginCredentials,
    Incident,
    DispatcherAction,
    RecordActionPayload,
    HotAlert,
} from '../types';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const authApi = {
    login: async (credentials: LoginCredentials): Promise<{ user: User }> => {
        const response = await api.post<{ user: User }>('/auth/login', credentials);
        return response.data;
    },

    logout: async (): Promise<{ success: boolean }> => {
        const response = await api.post<{ success: boolean }>('/auth/logout');
        return response.data;
    },

    getMe: async (): Promise<User> => {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },
};

export interface IncidentFilters { status?: string; systemObjectId?: number; search?: string; dateFrom?: string; dateTo?: string; offset?: number; }

export const incidentsApi = {
    getAll: async (filters: IncidentFilters = {}): Promise<Incident[]> => {
        const response = await api.get<Incident[]>('/incidents', { params: filters });
        return response.data;
    },

    recordAction: async (
        incidentId: string,
        payload: RecordActionPayload
    ): Promise<DispatcherAction> => {
        const response = await api.post<DispatcherAction>(
            `/incidents/${incidentId}/action`,
            payload
        );
        return response.data;
    },
};

export const alertsApi = {
    getHot: async (limit = 10): Promise<HotAlert[]> => {
        const response = await api.get<HotAlert[]>(`/alerts/hot?limit=${limit}`);
        return response.data;
    },

    acknowledge: async (
        alertId: string
    ): Promise<{ success: boolean; acknowledgedId: string }> => {
        const response = await api.post<{ success: boolean; acknowledgedId: string }>(
            `/alerts/${alertId}/ack`
        );
        return response.data;
    },

    //sse
    getStreamUrl: (): string => {
        return `${api.defaults.baseURL}/alerts/stream`;
    },
};
