import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { get } from 'node:http';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';
import { redis } from '../src/redis.js';
import { processTelemetryCycle } from '../src/workers/telemetry.worker.js';

if (!process.env.DATABASE_URL?.includes('moscollector_acceptance')) throw new Error('Use an isolated moscollector_acceptance database');
const suffix = Date.now();
const objectId = 1900000000 + suffix % 10000000;
const channelId = objectId;
const eventId = String(BigInt(suffix) * 1000n);
const checks: string[] = [];
async function main() {
  const admin = await prisma.user.create({ data: { email: `admin-${suffix}@test.local`, name: 'Test', password: 'unused', role: 'ADMIN' } });
  const analyst = await prisma.user.create({ data: { email: `analyst-${suffix}@test.local`, name: 'Test', password: 'unused', role: 'ANALYST' } });
  const token = (id: string) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '1h' })}`;
  const call = (method: 'get' | 'post', path: string, body?: unknown, user = admin.id) => {
    const query = request(app)[method](path).set('Authorization', token(user));
    return body === undefined ? query : query.send(body);
  };
  assert.equal((await request(app).get('/api/alerts/hot')).status, 401);
  assert.equal((await request(app).get('/api/alerts/stream')).status, 401);
  assert.equal((await call('post', '/api/integrations/objects', { items: [] }, analyst.id)).status, 403);
  checks.push('Protected alerts/SSE and role enforcement');
  const object = { id: objectId, level: 1, objectKind: 'controlHouse', dispatcherName: 'Acceptance fixture', latitude: 55.75, longitude: 37.61 };
  assert.equal((await call('post', '/api/integrations/objects', { items: [object] })).status, 200);
  assert.equal((await call('post', '/api/integrations/objects', { items: [{ ...object, parentId: objectId }] })).status, 400);
  assert.equal((await call('post', '/api/integrations/channels', { items: [{ id: channelId, systemObjectId: objectId, sensorName: 'Temperature', systemTag: 'test', systemType: 'temperature' }] })).status, 200);
  const events = { items: [{ id: eventId, channelId, recordedAt: '2026-08-01T12:00:00+03:00', isAlarm: true, numericValue: 32 }] };
  assert.equal((await call('post', '/api/integrations/telemetry', events)).status, 202);
  assert.equal((await call('post', '/api/integrations/telemetry', events)).body.inserted, 0);
  const conflictId = String(BigInt(eventId) + 20n);
  assert.equal((await call('post', '/api/integrations/telemetry', { items: [
    { ...events.items[0], id: conflictId }, { ...events.items[0], numericValue: 99 },
  ] })).status, 409);
  assert.equal(await prisma.eventLog.count({ where: { id: BigInt(conflictId) } }), 0, 'Conflicting batch must roll back entirely');
  assert.equal((await call('post', '/api/integrations/telemetry', { items: [
    { ...events.items[0], id: conflictId }, { ...events.items[0], id: conflictId, isAlarm: false },
  ] })).status, 409);
  const racing = await Promise.all([true, false].map(isAlarm => call('post', '/api/integrations/telemetry', {
    items: [{ ...events.items[0], id: conflictId, isAlarm }],
  })));
  assert.deepEqual(racing.map(v => v.status).sort(), [202, 409], 'Concurrent conflicting IDs cannot both succeed');
  checks.push('Conflicting telemetry IDs rejected within batches, across requests and concurrently; atomic rollback verified');
  assert.ok(await prisma.forecastJob.findUnique({ where: { systemObjectId: objectId } }));
  assert.equal((await call('post', '/api/integrations/telemetry', { items: [{ ...events.items[0], id: '99', channelId: 2147483646 }] })).status, 400);
  assert.equal((await call('post', '/api/integrations/telemetry', { items: [{ ...events.items[0], id: '100', isAlarm: 'false' }] })).status, 400);
  checks.push('Transactional imports, duplicate handling, invalid channel and boolean rejection');
  const xml = `<batch><items><item><id>${BigInt(eventId) + 1n}</id><channelId>${channelId}</channelId><recordedAt>2026-08-01T12:10:00+03:00</recordedAt><isAlarm>false</isAlarm></item></items></batch>`;
  assert.equal((await request(app).post('/api/integrations/telemetry').set('Authorization', token(admin.id)).type('xml').send(xml)).status, 202);
  assert.equal((await request(app).post('/api/integrations/telemetry').set('Authorization', token(admin.id)).type('xml').send('<!DOCTYPE x><batch/>')).status, 400);
  checks.push('XML ingestion and DTD rejection');
  assert.equal((await call('post', '/api/integrations/work-requests', { items: [{ externalId: `work-${suffix}`,
    systemObjectId: objectId, status: 'PLANNED', description: 'Acceptance work context',
    startsAt: '2026-08-01T12:00:00+03:00', endsAt: '2026-08-01T16:00:00+03:00' }] })).status, 200);
  const ml = process.env.ML_SERVICE_URL;
  process.env.ML_SERVICE_URL = 'http://127.0.0.1:1';
  await processTelemetryCycle();
  assert.equal((await prisma.forecastJob.findUniqueOrThrow({ where: { systemObjectId: objectId } })).attempts, 1);
  process.env.ML_SERVICE_URL = ml;
  await prisma.forecastJob.update({ where: { systemObjectId: objectId }, data: { retryAt: new Date(0) } });
  const start = performance.now();
  await processTelemetryCycle();
  const elapsed = performance.now() - start;
  assert.equal(await prisma.forecastJob.count({ where: { systemObjectId: objectId } }), 0);
  const forecasts = await prisma.forecast.findMany({ where: { systemObjectId: objectId } });
  assert.equal(forecasts.length, 1);
  assert.ok(forecasts[0]!.reason.includes(`work-${suffix}`), 'Forecast retains overlapping work context');
  assert.ok(forecasts[0]!.horizonHours >= 24 && elapsed < 300000);
  await prisma.forecastJob.create({ data: { systemObjectId: objectId } });
  await processTelemetryCycle();
  assert.equal(await prisma.forecast.count({ where: { systemObjectId: objectId } }), 1);
  checks.push(`Real model inference, durable failure retry and idempotent forecast: ${elapsed.toFixed(0)} ms`);
  const incident = await prisma.incident.create({ data: { systemObjectId: objectId, scenario: 'Acceptance workflow', horizon: '24 часа', reason: 'Test only', probability: 75 } });
  const incidentQuery = `/api/incidents?search=${encodeURIComponent(object.dispatcherName)}&systemObjectId=${objectId}`;
  const filtered = await call('get', incidentQuery, undefined, analyst.id);
  assert.equal(filtered.status, 200);
  assert.ok(filtered.body.some((row: { id: string }) => row.id === incident.id), 'Navigation search includes open incidents');
  assert.ok(filtered.body.every((row: { systemObjectId: number }) => row.systemObjectId === objectId), 'Navigation is scoped to the selected object');
  assert.equal((await call('get', `/api/incidents?systemObjectId=${objectId}&status=BOGUS`)).status, 400);
  checks.push('Object-to-incident navigation filters and analyst read access');
  assert.equal((await call('post', `/api/incidents/${incident.id}/action`, { decision: 'FALSE_ALARM', reasonCode: 'SITE_INSPECTION' }, analyst.id)).status, 403);
  assert.equal((await call('post', `/api/incidents/${incident.id}/action`, { decision: 'FALSE_ALARM', reasonCode: 'SITE_INSPECTION' })).status, 201);
  assert.equal((await prisma.incident.findUniqueOrThrow({ where: { id: incident.id } })).status, 'FALSE_POSITIVE');
  assert.equal((await call('post', `/api/incidents/${incident.id}/action`, { decision: 'BOGUS', reasonCode: 'OTHER' })).status, 400);
  assert.equal((await call('post', `/api/alerts/${incident.id}/ack`)).status, 409);
  checks.push('Dispatcher false-positive outcome and decision validation');
  const tracking = await prisma.incident.create({ data: { systemObjectId: objectId, scenario: 'Resolution test', horizon: '24 часа', reason: 'Test only' } });
  for (const decision of ['INSPECTION_COMPLETED', 'REPAIR_COMPLETED', 'OTHER']) {
    assert.equal((await call('post', `/api/incidents/${tracking.id}/action`, { decision, reasonCode: 'SITE_INSPECTION', comment: '  ' })).status, 400);
  }
  for (const decision of ['SITE_VISIT', 'INSPECTION_COMPLETED', 'CONFIRM_INCIDENT', 'MONITORING', 'MAINTENANCE_SCHEDULED', 'OTHER', 'REPAIR_COMPLETED']) {
    assert.equal((await call('post', `/api/incidents/${tracking.id}/action`, { decision, reasonCode: 'SITE_INSPECTION', comment: 'Observed and documented in acceptance fixture' })).status, 201);
  }
  assert.equal((await prisma.incident.findUniqueOrThrow({ where: { id: tracking.id } })).status, 'RESOLVED');
  assert.equal(await prisma.dispatcherAction.count({ where: { incidentId: tracking.id } }), 7);
  assert.equal((await call('post', `/api/incidents/${tracking.id}/action`, { decision: 'MONITORING', reasonCode: 'SENSOR_CHECK' })).status, 409);
  const guidance = await call('get', `/api/objects/${objectId}/maintenance`);
  assert.equal(guidance.status, 200);
  assert.ok(guidance.body.sections.length >= 5);
  assert.ok(guidance.body.observations.every((v: { fresh: boolean }) => !v.fresh), 'Historical readings must not imply current condition');
  assert.ok(guidance.body.draftText.includes(String(objectId)));
  const draftBody = { content: guidance.body.draftText + '\nReviewed fixture draft', version: guidance.body.version };
  assert.equal((await call('post', `/api/objects/${objectId}/repair-drafts`, draftBody, analyst.id)).status, 403);
  assert.equal((await call('post', `/api/objects/${objectId}/repair-drafts`, { ...draftBody, content: '' })).status, 400);
  const draft = await call('post', `/api/objects/${objectId}/repair-drafts`, draftBody);
  assert.equal(draft.status, 201);
  const storedDrafts = await call('get', `/api/objects/${objectId}/repair-drafts`);
  assert.equal(storedDrafts.body[0].content, draftBody.content);
  assert.equal(storedDrafts.body[0].userId, admin.id);
  const registry = await call('get', '/api/objects');
  assert.equal(registry.body.find((v: { id: number }) => v.id === objectId).channels[0].systemTag, 'test');
  checks.push('Inspection/monitoring/confirmed incident to repair resolution; condition guidance; persisted repair drafts and RBAC; searchable channel metadata');
  const concurrentStart = performance.now();
  const responses = await Promise.all(Array.from({ length: 20 }, () => call('get', '/api/objects')));
  assert.ok(responses.every(response => response.status === 200));
  checks.push(`20 concurrent authenticated object reads: ${(performance.now() - concurrentStart).toFixed(0)} ms (small fixture)`);
  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => listener.once('listening', resolve));
  const address = listener.address();
  assert.ok(address && typeof address !== 'string');
  try {
    await Promise.all(Array.from({ length: 20 }, () => new Promise<void>((resolve, reject) => {
      const stream = get(`http://127.0.0.1:${address.port}/api/alerts/stream`, { headers: { Authorization: token(admin.id) } }, response => {
        if (response.statusCode !== 200) { response.resume(); reject(new Error('SSE authentication failed')); return; }
        response.once('data', data => {
          try { assert.match(data.toString(), /CONNECTED/); stream.destroy(); resolve(); }
          catch (error) { reject(error); }
        });
      });
      stream.on('error', reject);
    })));
    checks.push('20 authenticated SSE connections accepted');
  } finally { await new Promise<void>(resolve => listener.close(() => resolve())); }
  console.log(JSON.stringify({ checks, modelVersion: forecasts[0]!.modelVersion }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); redis.disconnect(); });
