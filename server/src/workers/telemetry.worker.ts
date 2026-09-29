import { prisma } from '../db.js';
import { predictIncidentRisk } from '../services/mlClient.service.js';
import { saveHotAlert } from '../services/alertCache.service.js';
let running = false;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processTelemetryCycle() {
  const jobs = await prisma.forecastJob.findMany({ where: { retryAt: { lte: new Date() } }, take: 20, orderBy: { updatedAt: 'asc' } });
  // Bounded concurrency prevents a slow object from blocking every other object.
  for (let index = 0; index < jobs.length; index += 4) {
    await Promise.all(jobs.slice(index, index + 4).map(async job => {
      try {
        const object = await prisma.systemObject.findUniqueOrThrow({ where: { id: job.systemObjectId } });
        const [latest, first] = await Promise.all([
          prisma.eventLog.findFirst({ where: { channel: { systemObjectId: object.id } }, orderBy: { recordedAt: 'desc' } }),
          prisma.eventLog.findFirst({ where: { channel: { systemObjectId: object.id } }, orderBy: { recordedAt: 'asc' } }),
        ]);
        if (!latest || !first) {
          await prisma.forecastJob.deleteMany({ where: { systemObjectId: object.id, revision: job.revision } });
          return;
        }
        const since = new Date(latest.recordedAt);
        since.setUTCMinutes(0, 0, 0);
        since.setUTCHours(since.getUTCHours() - 167);
        // Aggregate in PostgreSQL rather than transferring a week of raw events.
        // These fields mirror the original DuckDB hourly training aggregation.
        const hourly = await prisma.$queryRaw<Array<{
          recordedAt: Date; events: number; alarms: number; active_channels: number; numeric_count: number;
          sensor_mean: number | null; sensor_min: number | null; sensor_max: number | null; sensor_std: number | null;
          fire_alarms: number; flood_alarms: number; pump_alarms: number; security_alarms: number; temperature_alarms: number;
        }>>`
          SELECT date_trunc('hour', e."recordedAt") AS "recordedAt",
            count(*)::double precision AS events,
            count(*) FILTER (WHERE e."isAlarm")::double precision AS alarms,
            count(DISTINCT e."channelId")::double precision AS active_channels,
            count(e."numericValue")::double precision AS numeric_count,
            avg(e."numericValue") AS sensor_mean, min(e."numericValue") AS sensor_min,
            max(e."numericValue") AS sensor_max, stddev_pop(e."numericValue") AS sensor_std,
            count(*) FILTER (WHERE e."isAlarm" AND c."systemType" = 'Пожарная охрана')::double precision AS fire_alarms,
            count(*) FILTER (WHERE e."isAlarm" AND c."sensorType" = 'Датчик затопления')::double precision AS flood_alarms,
            count(*) FILTER (WHERE e."isAlarm" AND c."sensorType" = 'Состояние насоса')::double precision AS pump_alarms,
            count(*) FILTER (WHERE e."isAlarm" AND c."systemType" = 'Охранная подсистема')::double precision AS security_alarms,
            count(*) FILTER (WHERE e."isAlarm" AND c."systemType" = 'Температурная подсистема')::double precision AS temperature_alarms
          FROM "EventLog" e JOIN "SensorChannel" c ON c.id = e."channelId"
          WHERE c."systemObjectId" = ${object.id} AND e."recordedAt" >= ${since} AND e."recordedAt" <= ${latest.recordedAt}
          GROUP BY date_trunc('hour', e."recordedAt") ORDER BY "recordedAt"
        `;
        const prediction = await predictIncidentRisk({ systemObjectId: object.id, dispatcherName: object.dispatcherName,
          objectKind: object.objectKind, timestamp: latest.recordedAt.toISOString(), historyStart: first.recordedAt.toISOString(),
          timeHorizonHours: 24, channels: [], hourly: hourly.map(row => ({ ...row, recordedAt: row.recordedAt.toISOString() })) });
        const work = await prisma.workRequest.findMany({ where: { systemObjectId: object.id,
          startsAt: { lte: new Date(latest.recordedAt.getTime() + prediction.horizonHours * 3600000) },
          endsAt: { gte: latest.recordedAt } }, orderBy: { startsAt: 'asc' }, take: 21 });
        if (work.length) {
          // Context is preserved in the forecast, without changing a calibrated score
          // or assuming that a work request explains/suppresses an alarm.
          prediction.reason += ` Заявки, пересекающие горизонт прогноза: ${work.slice(0, 20).map(v => `${v.externalId} (${v.status})`).join('; ')}${work.length > 20 ? '; и другие' : ''}.`;
          prediction.recommendation += ' Сопоставить показания со статусами и содержанием этих работ; причинная связь не установлена.';
        }
        const incident = await prisma.$transaction(async tx => {
          const forecast = await tx.forecast.upsert({
            where: { systemObjectId_evaluatedAt_modelVersion: { systemObjectId: object.id,
              evaluatedAt: new Date(prediction.evaluatedAt), modelVersion: prediction.modelVersion } },
            update: { probability: prediction.probability, threshold: prediction.threshold,
              isIncidentPredicted: prediction.isIncidentPredicted, reason: prediction.reason,
              recommendation: prediction.recommendation }, create: { systemObjectId: object.id, evaluatedAt: new Date(prediction.evaluatedAt),
              probability: prediction.probability, threshold: prediction.threshold,
              isIncidentPredicted: prediction.isIncidentPredicted, horizonHours: prediction.horizonHours,
              modelVersion: prediction.modelVersion, scenario: prediction.incidentType,
              reason: prediction.reason, recommendation: prediction.recommendation },
          });
          let created = null;
          // Keep every forecast, but one open incident per object/scenario to avoid alert storms.
          if (prediction.isIncidentPredicted && !await tx.incident.findFirst({ where: { OR: [
            { forecastId: forecast.id }, { systemObjectId: object.id, scenario: prediction.incidentType,
              status: { in: ['OPEN', 'IN_PROGRESS', 'CONFIRMED'] } },
          ] } })) {
            created = await tx.incident.create({ data: { systemObjectId: object.id, forecastId: forecast.id,
              probability: prediction.probability, modelVersion: prediction.modelVersion,
              scenario: prediction.incidentType, horizon: prediction.horizon, reason: prediction.reason,
              recommendation: prediction.recommendation } });
          }
          await tx.forecastJob.deleteMany({ where: { systemObjectId: object.id, revision: job.revision } });
          return created;
        });
        if (incident) {
          // PostgreSQL remains authoritative if the notification cache is unavailable.
          await saveHotAlert({ ...incident, dispatcherName: object.dispatcherName,
            createdAt: incident.createdAt.toISOString() }).catch(error => console.error('Alert cache unavailable', error));
        }
      } catch (error) {
        console.error(`Inference failed for ${job.systemObjectId}:`, error instanceof Error ? error.message : 'Unknown failure');
        await prisma.forecastJob.updateMany({ where: { systemObjectId: job.systemObjectId, revision: job.revision },
          data: { attempts: { increment: 1 }, lastError: 'Inference failed; inspect server logs',
            retryAt: new Date(Date.now() + Math.min(60000, 2000 * 2 ** Math.min(job.attempts, 5))) } });
      }
    }));
  }
}
export async function startTelemetryWorker() {
  if (running) return;
  running = true;
  while (running) {
    try { await processTelemetryCycle(); } catch (error) { console.error('Telemetry worker error', error); }
    await sleep(2000);
  }
}
export function stopTelemetryWorker() { running = false; }
