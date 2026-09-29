import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesObject, equipmentCategories, hasCoordinates } from '../../client/src/lib/mapObjects.ts';
import { buildMaintenance } from '../src/services/maintenance.ts';
import { sensorStateEvidence } from '../src/services/sensorStateEvidence.ts';
const now = new Date('2026-09-28T10:00:00Z');
const object = { id: 42, dispatcherName: 'Насосная Альфа', objectKind: 'pump', address: 'Лесная 12', channels: [{ id: 1, sensorName: 'Давление', systemTag: 'W-42', systemType: 'water', sensorType: 'pressure', events: [{ recordedAt: now, isAlarm: true, numericValue: 0, rawValue: null }] }], forecasts: [] };
test('Map search covers IDs, names, tags, address and equipment; missing locations are explicit', () => {
 for (const q of ['42', 'альфа', 'W-42', 'лесная', 'pressure', 'водоснабжение']) assert.ok(matchesObject(object as never,q),q);
 assert.deepEqual(equipmentCategories(object as never),['water']);
 assert.equal(matchesObject(object as never,'missing'),false);
 assert.equal(hasCoordinates(object as never),false);
 assert.equal(hasCoordinates({ ...object, latitude: 0, longitude: 0 } as never),true);
 assert.equal(hasCoordinates({ ...object, latitude: NaN, longitude: 12 } as never),false);
});

test('Customer state dictionary preserves conflicts, source alarms and date anomalies', () => {
 assert.match(sensorStateEvidence('Газовый датчик', 'Температура ниже 3ºC1', false)!, /противоречивые/);
 assert.match(sensorStateEvidence('КД Дверь', 'Неисправен', false)!, /отличается/);
 assert.equal(sensorStateEvidence('Unknown', 'Неисправен', true), null);
 assert.equal(sensorStateEvidence('Газовый датчик', 0, false), null);
 assert.match(sensorStateEvidence('Газовый датчик', '01.01.1970 03:00:01', false)!, /Не интерпретировать/);
 const item = { ...object, channels: [{ ...object.channels[0], sensorType: 'Газовый датчик',
   events: [{ recordedAt: now, isAlarm: false, numericValue: null, rawValue: 'Температура ниже 3ºC1' }] }] };
 const guidance = buildMaintenance(item as never, now.getTime());
 assert.equal(guidance.observations[0]?.alarm, false);
 assert.equal(guidance.observations[0]?.value, 'Температура ниже 3ºC1');
 assert.match(guidance.observations[0]?.stateEvidence ?? '', /противоречивые/);
 assert.match(guidance.draftText, /Газоанализаторы и контроль метана/);
 assert.match(guidance.draftText, /не является основанием автоматически отключать тревогу/);
});
test('Maintenance uses actual zero-valued readings and distinguishes current from stale evidence', () => {
 const current=buildMaintenance(object as never,now.getTime());
 assert.equal(current.observations[0]?.value,0);
 assert.equal(current.observations[0]?.condition,'Тревожный сигнал');
 assert.ok(current.sections.some(v=>v.title.includes('насосное')));
 assert.ok(!current.sections.some(v=>v.title==='Электрическое оборудование'));
 const stale=buildMaintenance(object as never,now.getTime()+3600000);
 assert.equal(stale.observations[0]?.fresh,false);
 assert.ok(stale.draftText.includes('Получить актуальную телеметрию'));
 const absent=buildMaintenance({ ...object, channels: [] } as never,now.getTime());
 assert.ok(absent.draftText.includes('Прогноз отсутствует'));
 assert.ok(absent.draftText.includes('Последовательность разборки'));
});
