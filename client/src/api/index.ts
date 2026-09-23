import axios from 'axios';
import type {
    User,
    LoginCredentials,
    Incident,
    DispatcherAction,
    RecordActionPayload,
    HotAlert,
    SystemObjectDetails,
} from '../types';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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

export interface IncidentFilters {
    status?: string;
    systemObjectId?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    take?: number;
    skip?: number;
}

export const incidentsApi = {
    getAll: async (filters: IncidentFilters = {}): Promise<Incident[]> => {
        // Удаляем пустые строки, undefined и null, чтобы в URL не летели пустые ключи (?status=&search=)
        const cleanParams = Object.entries(filters).reduce<Record<string, unknown>>((acc, [key, val]) => {
            if (val !== undefined && val !== '' && val !== null) {
                acc[key] = val;
            }
            return acc;
        }, {});

        const response = await api.get<Incident[]>('/incidents', {
            params: cleanParams,
        });
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
    getHot: async (limit = 50): Promise<HotAlert[]> => {
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

export const objectsApi = {
    getById: async (id: string | number): Promise<SystemObjectDetails> => {
        const { data } = await api.get<SystemObjectDetails>(`/objects/${id}`);
        return data;
    },

    getAll: async (): Promise<SystemObjectDetails[]> => {
        const { data } = await api.get<SystemObjectDetails[]>('/objects');
        return data;
    },
};