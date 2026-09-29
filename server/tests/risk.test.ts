import assert from 'node:assert/strict';
import { test } from 'node:test';
import { objectRisk, isForecastFresh } from '../../client/src/lib/objectRisk.ts';
import type { SystemObject, Forecast } from '../../client/src/types/index.ts';

const now = Date.parse('2026-09-28T12:00:00Z');
const forecast = (at: string, predicted = false): Forecast => ({ id: 'f', systemObjectId: 1, evaluatedAt: at,
  probability: 10, threshold: 30, isIncidentPredicted: predicted, horizonHours: 24, modelVersion: 'test',
  scenario: 'Alarm proxy', reason: 'Test', recommendation: 'Test' });
test('Stale, missing, invalid and future forecasts never imply present risk', () => {
  for (const time of ['2026-09-01T12:00:00Z', 'invalid', '2027-01-01T00:00:00Z']) {
    const object = { id: 1, dispatcherName: 'Test', forecasts: [forecast(time)], incidents: [{ status: 'OPEN' }] } as SystemObject;
    assert.equal(objectRisk(object, now), 'unknown');
  }
  assert.equal(isForecastFresh(undefined, now), false);
});
test('Fresh forecasts distinguish threshold and unresolved workflow attention', () => {
  const object: SystemObject = { id: 1, dispatcherName: 'Test', forecasts: [forecast('2026-09-28T12:00:00Z')] };
  assert.equal(objectRisk(object, now), 'normal');
  object.forecasts![0]!.isIncidentPredicted = true;
  assert.equal(objectRisk(object, now), 'warning');
  object.incidents = [{ status: 'IN_PROGRESS' }] as SystemObject['incidents'];
  assert.equal(objectRisk(object, now), 'critical'); // Internal color key; UI says "requires verification".
  object.incidents = [{ status: 'CONFIRMED' }] as SystemObject['incidents'];
  assert.equal(objectRisk(object, now), 'critical');
  object.incidents = [{ status: 'RESOLVED' }] as SystemObject['incidents'];
  assert.equal(objectRisk(object, now), 'warning');
});
