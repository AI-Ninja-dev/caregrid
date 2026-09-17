import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTrendSeries } from '../lib/trends.ts';

test('trend series preserve measurement units and chronological order', () => {
  const series = buildTrendSeries([
    { measured_at: '2026-09-17T10:00:00+02:00', payload: { source: 'test-adapter', sourceEventId: '2', deviceId: 'g1', measuredAt: '2026-09-17T10:00:00+02:00', measurement: { kind: 'glucose', value: 6.1, unit: 'mmol/L' } } },
    { measured_at: '2026-09-17T08:00:00+02:00', payload: { source: 'test-adapter', sourceEventId: '1', deviceId: 'g1', measuredAt: '2026-09-17T08:00:00+02:00', measurement: { kind: 'glucose', value: 5.8, unit: 'mmol/L' } } },
  ]);
  assert.equal(series.length, 1);
  assert.equal(series[0].label, 'Glucose');
  assert.equal(series[0].unit, 'mmol/L');
  assert.deepEqual(series[0].points.map(point => point.value), [5.8, 6.1]);
});

test('blood-pressure readings become separate systolic, diastolic and pulse display series', () => {
  const series = buildTrendSeries([
    { measured_at: '2026-09-17T08:00:00+02:00', payload: { source: 'test-adapter', sourceEventId: '1', deviceId: 'bp1', measuredAt: '2026-09-17T08:00:00+02:00', measurement: { kind: 'blood-pressure', systolic: 120, diastolic: 80, pulse: 70, unit: 'mmHg' } } },
  ]);
  assert.deepEqual(series.map(item => item.id), ['blood-pressure-systolic', 'blood-pressure-diastolic', 'blood-pressure-pulse']);
  assert.deepEqual(series.map(item => item.unit), ['mmHg', 'mmHg', 'bpm']);
});

test('trend builder limits history without adding clinical interpretation', () => {
  const readings = Array.from({ length: 5 }, (_, index) => ({
    measured_at: `2026-09-1${index + 1}T08:00:00+02:00`,
    payload: { source: 'test-adapter', sourceEventId: String(index), deviceId: 'o1', measuredAt: `2026-09-1${index + 1}T08:00:00+02:00`, measurement: { kind: 'spo2' as const, value: 95 + index, unit: '%' as const } },
  }));
  const [series] = buildTrendSeries(readings, 3);
  assert.deepEqual(series.points.map(point => point.value), [97, 98, 99]);
  assert.equal(Object.prototype.hasOwnProperty.call(series, 'status'), false);
  assert.throws(() => buildTrendSeries(readings, 1), /integer from 2 to 500/);
});
