import type { SystemObject, Forecast } from '../types';

export function isForecastFresh(forecast: Forecast | undefined, now = Date.now()): boolean {
  if (!forecast) return false;
  const age = now - Date.parse(forecast.evaluatedAt);
  return Number.isFinite(age) && age >= -60000 && age <= 300000;
}

export function objectRisk(object: SystemObject, now = Date.now()): 'critical' | 'warning' | 'normal' | 'unknown' {
  const forecast = object.forecasts?.[0];
  // Open workflow items do not establish the present physical condition or severity.
  if (!isForecastFresh(forecast, now)) return 'unknown';
  if (object.incidents?.some(v => v.status === 'OPEN' || v.status === 'IN_PROGRESS' || v.status === 'CONFIRMED')) return 'critical';
  return forecast!.isIncidentPredicted ? 'warning' : 'normal';
}
