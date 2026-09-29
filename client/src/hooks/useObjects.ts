import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import type { SystemObject, Forecast } from '../types';
export { objectRisk, isForecastFresh } from '../lib/objectRisk';

export function useObjects() {
  return useQuery({ queryKey: ['objects'], queryFn: async () => (await api.get<SystemObject[]>('/objects')).data, refetchInterval: 30000 });
}
export function useSummary() {
  return useQuery({ queryKey: ['summary'], queryFn: async () => (await api.get<{ status: string; _count: { _all: number } }[]>('/summary')).data, refetchInterval: 30000 });
}
export function useObject(id: string | undefined) {
  return useQuery({ queryKey: ['objects', id], queryFn: async () => (await api.get<SystemObject>(`/objects/${id}`)).data,
    enabled: !!id, refetchInterval: 30000 });
}
export function useForecasts(offset = 0) {
  return useQuery({ queryKey: ['forecasts', offset], queryFn: async () => (await api.get<Forecast[]>(`/forecasts?offset=${offset}`)).data, refetchInterval: 30000 });
}
