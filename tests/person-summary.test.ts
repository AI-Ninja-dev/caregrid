import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPersonSummaries } from '../lib/person-summary.ts';

test('person summaries aggregate workflow state without classifying measurement values', () => {
  const summaries = buildPersonSummaries({
    people: [{ id: 'P-1' }, { id: 'P-2' }],
    devices: [
      { id: 'D-1', person_id: 'P-1', enabled: 1 },
      { id: 'D-2', person_id: 'P-1', enabled: 0 },
    ],
    readings: [
      { person_id: 'P-1', device_id: 'D-1', measured_at: '2026-09-17T08:00:00+02:00', payload: { measurement: { kind: 'blood-pressure' as const } } },
      { person_id: 'P-1', device_id: 'D-1', measured_at: '2026-09-16T08:00:00+02:00', payload: { measurement: { kind: 'blood-pressure' as const } } },
      { person_id: 'P-1', device_id: 'D-1', measured_at: '2026-09-17T07:30:00+02:00', payload: { measurement: { kind: 'spo2' as const } } },
    ],
    tasks: [
      { person_id: 'P-1', owner: null, stage: 'To do' },
      { person_id: 'P-1', owner: 'U-1', stage: 'In progress' },
      { person_id: 'P-1', owner: null, stage: 'Completed' },
    ],
    plans: [
      { person_id: 'P-1', next_review: '2026-09-17', status: 'Active' },
      { person_id: 'P-1', next_review: '2026-09-18', status: 'Needs review' },
      { person_id: 'P-1', next_review: '2026-09-01', status: 'Paused' },
    ],
  }, { now: new Date('2026-09-17T12:00:00+02:00') });

  const first = summaries.find(summary => summary.personId === 'P-1')!;
  assert.equal(first.latestReadingAt, '2026-09-17T08:00:00+02:00');
  assert.equal(first.latestReadings['blood-pressure']?.measuredAt, '2026-09-17T08:00:00+02:00');
  assert.equal(first.latestReadings.spo2?.measuredAt, '2026-09-17T07:30:00+02:00');
  assert.deepEqual(first.devices, { total: 2, enabled: 1 });
  assert.deepEqual(first.tasks, { open: 2, unassigned: 1 });
  assert.deepEqual(first.plans, { total: 3, active: 2, due: 1 });

  const second = summaries.find(summary => summary.personId === 'P-2')!;
  assert.equal(second.latestReadingAt, null);
  assert.deepEqual(second.devices, { total: 0, enabled: 0 });
});
