import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, incidentsApi, alertsApi } from '../api';
import type {
    RecordActionPayload,
    User,
    Incident,
    HotAlert,
} from '../types';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const QUERY_KEYS = {
    auth: ['auth', 'me'] as const,
    incidents: ['incidents'] as const,
    hotAlerts: ['alerts', 'hot'] as const,
};

const mockUser: User = {
    id: 'mock-dispatcher-1',
    email: 'dispatcher@moscollector.local',
    name: 'Иванов А.А.',
    role: 'DISPATCHER',
};

const mockIncidents: Incident[] = [
    {
        id: 'incident-0001',
        systemObjectId: 5122,
        scenario: 'Перегрев подшипника насоса',
        horizon: '24–48 часов',
        reason: 'Резкий рост вибрации на фоне падения давления масла',
        status: 'OPEN',
        recommendation: 'Остановить агрегат на ТО и направить дежурную бригаду',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'incident-0002',
        systemObjectId: 3814,
        scenario: 'Повышенный пожарный риск',
        horizon: '24 часа',
        reason: 'Аномальный рост температуры в кабельном отсеке',
        status: 'IN_PROGRESS',
        recommendation: 'Проверить кабельную линию и вентиляцию отсека',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const mockAlerts: HotAlert[] = [
    {
        id: 'alert-0001',
        systemObjectId: 5122,
        dispatcherName: 'ДУ объект Альфа',
        scenario: 'Перегрев подшипника насоса',
        horizon: '24–48 часов',
        reason: 'Резкий рост вибрации на фоне падения давления масла',
        recommendation: 'Остановить агрегат на ТО и направить дежурную бригаду',
        createdAt: new Date().toISOString(),
    },
];

export function useAuth() {
    const queryClient = useQueryClient();

    const userQuery = useQuery({
        queryKey: QUERY_KEYS.auth,
        queryFn: authApi.getMe,
        retry: false,
        staleTime: 5 * 60 * 1000,
        enabled: !USE_MOCKS,
    });

    const logoutMutation = useMutation({
        mutationFn: authApi.logout,
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEYS.auth, null);
            queryClient.clear();
        },
    });

    if (USE_MOCKS) {
        return {
            user: mockUser,
            isLoading: false,
            logout: () => {},
        };
    }

    return {
        user: userQuery.data,
        isLoading: userQuery.isLoading,
        logout: logoutMutation.mutate,
    };
}

export function useIncidents() {
    const queryClient = useQueryClient();

    const incidentsQuery = useQuery({
        queryKey: QUERY_KEYS.incidents,
        queryFn: incidentsApi.getAll,
        staleTime: 30 * 1000,
        enabled: !USE_MOCKS,
    });

    const recordActionMutation = useMutation({
        mutationFn: ({
            incidentId,
            payload,
        }: {
            incidentId: string;
            payload: RecordActionPayload;
        }) => incidentsApi.recordAction(incidentId, payload),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.incidents,
            });
        },
    });

    if (USE_MOCKS) {
        return {
            incidents: mockIncidents,
            isLoading: false,
            recordAction: async () => {},
            isRecording: false,
        };
    }

    return {
        incidents: incidentsQuery.data ?? [],
        isLoading: incidentsQuery.isLoading,
        recordAction: recordActionMutation.mutateAsync,
        isRecording: recordActionMutation.isPending,
    };
}

export function useHotAlerts(limit = 10) {
    const queryClient = useQueryClient();

    const alertsQuery = useQuery({
        queryKey: QUERY_KEYS.hotAlerts,
        queryFn: () => alertsApi.getHot(limit),
        staleTime: Infinity,
        enabled: !USE_MOCKS,
    });

    const ackMutation = useMutation({
        mutationFn: alertsApi.acknowledge,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.hotAlerts,
            });
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.incidents,
            });
        },
    });

    useEffect(() => {
        if (USE_MOCKS) return;

        const streamUrl = alertsApi.getStreamUrl();

        const eventSource = new EventSource(streamUrl, {
            withCredentials: true,
        });

        const handleUpdate = () => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.hotAlerts,
            });
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.incidents,
            });
        };

        eventSource.addEventListener('hot_alert', handleUpdate);
        eventSource.addEventListener('alert_resolved', handleUpdate);

        eventSource.onerror = (err) => {
            console.error('SSE Stream Error:', err);
        };

        return () => {
            eventSource.removeEventListener('hot_alert', handleUpdate);
            eventSource.removeEventListener('alert_resolved', handleUpdate);
            eventSource.close();
        };
    }, [queryClient]);

    if (USE_MOCKS) {
        return {
            alerts: mockAlerts,
            isLoading: false,
            acknowledge: () => {},
            isAcking: false,
        };
    }

    return {
        alerts: alertsQuery.data ?? [],
        isLoading: alertsQuery.isLoading,
        acknowledge: ackMutation.mutate,
        isAcking: ackMutation.isPending,
    };
}