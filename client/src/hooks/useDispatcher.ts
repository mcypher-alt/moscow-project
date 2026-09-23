import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { authApi, incidentsApi, alertsApi, objectsApi } from '../api';
import type { IncidentFilters } from '../api';
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
    objects: ['objects'] as const,
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



export function useIncidents(filters?: IncidentFilters) {
    const queryClient = useQueryClient();

    const incidentsQuery = useQuery({
        // Разворачиваем префикс через spread! Ключ будет: ['incidents', { search: ... }]
        queryKey: [...QUERY_KEYS.incidents, filters],
        queryFn: () => incidentsApi.getAll(filters),
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
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
            // Инвалидируем по плоскому префиксу ['incidents']
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.incidents,
            });
        },
        onError: (err) => {
            console.error('[recordActionMutation Error]:', err);
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
        isFetching: incidentsQuery.isFetching,
        recordAction: recordActionMutation.mutateAsync,
        isRecording: recordActionMutation.isPending,
    };
}

export function useObjectDetails(id: string | number | undefined) {
    return useQuery({
        queryKey: [...QUERY_KEYS.objects, String(id)],
        queryFn: () => objectsApi.getById(id!),
        enabled: Boolean(id), // Запрос не пойдет, пока id не определен из useParams
        staleTime: 30 * 1000,
    });
}

export function useObjects() {
    return useQuery({
        queryKey: QUERY_KEYS.objects, // ключ ['objects']
        queryFn: objectsApi.getAll,
        staleTime: 30 * 1000,
    });
}

export function useHotAlerts(limit = 10) {
    const queryClient = useQueryClient();

    const alertsQuery = useQuery({
        queryKey: [...QUERY_KEYS.hotAlerts, limit],
        queryFn: () => alertsApi.getHot(limit),
        staleTime: Infinity,
        enabled: !USE_MOCKS,
    });

    const ackMutation = useMutation({
        mutationFn: alertsApi.acknowledge,
        onSuccess: () => {
            // Инвалидируем горячие алерты (Redis)
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.hotAlerts,
            });
            // Инвалидируем инциденты (Postgres) — найдет ['incidents', filters]
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.incidents,
            });
        },
        onError: (err) => {
            console.error('[ackMutation Error] Ошибка квитирования:', err);
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