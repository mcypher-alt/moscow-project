import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, incidentsApi, alertsApi } from '../api';
import type { RecordActionPayload } from '../types';

export const QUERY_KEYS = {
    auth: ['auth', 'me'] as const,
    incidents: ['incidents'] as const,
    hotAlerts: ['alerts', 'hot'] as const,
};

// Сессия диспетчера
export function useAuth() {
    const queryClient = useQueryClient();

    const userQuery = useQuery({
        queryKey: QUERY_KEYS.auth,
        queryFn: authApi.getMe,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const logoutMutation = useMutation({
        mutationFn: authApi.logout,
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEYS.auth, null);
            queryClient.clear();
        },
    });

    return {
        user: userQuery.data,
        isLoading: userQuery.isLoading,
        logout: logoutMutation.mutate,
    };
}

// Инциденты и действия
export function useIncidents() {
    const queryClient = useQueryClient();

    const incidentsQuery = useQuery({
        queryKey: QUERY_KEYS.incidents,
        queryFn: incidentsApi.getAll,
        staleTime: 30 * 1000,
    });

    const recordActionMutation = useMutation({
        mutationFn: ({ incidentId, payload }: { incidentId: string; payload: RecordActionPayload }) =>
            incidentsApi.recordAction(incidentId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incidents });
        },
    });

    return {
        incidents: incidentsQuery.data ?? [],
        isLoading: incidentsQuery.isLoading,
        recordAction: recordActionMutation.mutateAsync,
        isRecording: recordActionMutation.isPending,
    };
}

// Горячие алерты + SSE слушатель
export function useHotAlerts(limit = 10) {
    const queryClient = useQueryClient();

    const alertsQuery = useQuery({
        queryKey: QUERY_KEYS.hotAlerts,
        queryFn: () => alertsApi.getHot(limit),
        staleTime: Infinity, // Актуализируется исключительно по SSE
    });

    const ackMutation = useMutation({
        mutationFn: alertsApi.acknowledge,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hotAlerts });
        },
    });

    // Фоновое SSE-подключение
    useEffect(() => {
        const streamUrl = alertsApi.getStreamUrl();
        const eventSource = new EventSource(streamUrl, { withCredentials: true });

        eventSource.onmessage = () => {
            // При любом событии из шины сбрасываем кэш алертов и инцидентов
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hotAlerts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incidents });
        };

        eventSource.onerror = (err) => {
            console.error('SSE Stream Error:', err);
        };

        return () => {
            eventSource.close();
        };
    }, [queryClient]);

    return {
        alerts: alertsQuery.data ?? [],
        isLoading: alertsQuery.isLoading,
        acknowledge: ackMutation.mutate,
        isAcking: ackMutation.isPending,
    };
}