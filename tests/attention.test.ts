import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOperationalAttention, deviceFreshnessMsFromHours } from '../lib/attention.ts';

const now = new Date('2026-09-17T10:00:00+02:00');

function snapshot() {
  return {
    people: [
      { id: 'P-1', active: 1 },
      { id: 'P-2', active: 1 },
      { id: 'P-3', active: 0 },
    ],
    devices: [
      { id: 'D-1', person_id: 'P-1', enabled: 1 },
      { id: 'D-2', person_id: 'P-2', enabled: 1 },
      { id: 'D-3', person_id: 'P-3', enabled: 1 },
    ],
    readings: [
      { device_id: 'D-2', measured_at: '2026-09-15T08:00:00+02:00' },
      { device_id: 'D-3', measured_at: '2026-09-10T08:00:00+02:00' },
    ],
    tasks: [
      { id: 'T-1', person_id: 'P-1', title: 'Arrange follow-up', owner: null, stage: 'To do' },
      { id: 'T-2', person_id: 'P-2', title: 'Already assigned', owner: 'U-1', stage: 'In progress' },
      { id: 'T-3', person_id: 'P-1', title: 'Completed', owner: null, stage: 'Completed' },
    ],
    plans: [
      { id: 'CP-1', person_id: 'P-1', focus: 'Connected monitoring', next_review: '2026-09-17', status: 'Active' },
      { id: 'CP-2', person_id: 'P-2', focus: 'Future review', next_review: '2026-09-18', status: 'Active' },
      { id: 'CP-3', person_id: 'P-1', focus: 'Paused plan', next_review: '2026-09-01', status: 'Paused' },
    ],
  };
}

test('operational attention surfaces workflow gaps without interpreting measurements', () => {
  const items = buildOperationalAttention(snapshot(), { now, deviceFreshnessMs: 24 * 60 * 60 * 1000 });
  assert.deepEqual(items.map(item => item.kind).sort(), [
    'device-awaiting-reading',
    'device-stale',
    'plan-review-due',
    'task-unassigned',
  ]);
  assert.ok(items.every(item => item.personId !== 'P-3'));
  assert.match(items.find(item => item.kind === 'device-stale')!.detail, /technical data-flow check only/);
});

test('device staleness is not inferred until an operational freshness policy is supplied', () => {
  const items = buildOperationalAttention(snapshot(), { now });
  assert.equal(items.some(item => item.kind === 'device-stale'), false);
  assert.equal(items.some(item => item.kind === 'device-awaiting-reading'), true);
});

test('invalid freshness policies are rejected instead of silently changing queue semantics', () => {
  assert.throws(() => buildOperationalAttention(snapshot(), { now, deviceFreshnessMs: 0 }), /positive finite number/);
  assert.throws(() => buildOperationalAttention(snapshot(), { now, deviceFreshnessMs: Number.NaN }), /positive finite number/);
});

test('freshness hours remain opt-in and convert explicitly to milliseconds', () => {
  assert.equal(deviceFreshnessMsFromHours(undefined), undefined);
  assert.equal(deviceFreshnessMsFromHours(''), undefined);
  assert.equal(deviceFreshnessMsFromHours('24'), 24 * 60 * 60 * 1000);
  assert.equal(deviceFreshnessMsFromHours('0.5'), 30 * 60 * 1000);
  assert.throws(() => deviceFreshnessMsFromHours('0'), /positive number of hours/);
  assert.throws(() => deviceFreshnessMsFromHours('not-a-number'), /positive number of hours/);
});
