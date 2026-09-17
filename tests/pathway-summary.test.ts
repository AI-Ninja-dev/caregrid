import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPathwaySummaries } from '../lib/pathway-summary.ts';

test('pathway summaries retain all four pillars and aggregate workflow counts', () => {
  const summaries = buildPathwaySummaries([
    { id: 'P-1', active: 1, pillar: 'Diabetes management' },
    { id: 'P-2', active: 0, pillar: 'Diabetes management' },
    { id: 'P-3', active: 1, pillar: 'Cardiovascular health' },
  ], [
    { personId: 'P-1', latestReadingAt: null, latestReadings: {}, devices: { total: 2, enabled: 1 }, tasks: { open: 2, unassigned: 1 }, plans: { total: 2, active: 2, due: 1 } },
    { personId: 'P-2', latestReadingAt: null, latestReadings: {}, devices: { total: 1, enabled: 0 }, tasks: { open: 1, unassigned: 1 }, plans: { total: 1, active: 0, due: 0 } },
    { personId: 'P-3', latestReadingAt: null, latestReadings: {}, devices: { total: 1, enabled: 1 }, tasks: { open: 0, unassigned: 0 }, plans: { total: 1, active: 1, due: 1 } },
  ]);

  assert.deepEqual(summaries.map(item => item.pillar), [
    'Diabetes management',
    'Hypertension management',
    'Cardiovascular health',
    'Stroke prevention',
  ]);
  assert.deepEqual(summaries[0], {
    pillar: 'Diabetes management',
    people: 2,
    activePeople: 1,
    enabledDevices: 1,
    openTasks: 3,
    unassignedTasks: 2,
    activePlans: 2,
    duePlans: 1,
  });
  assert.equal(summaries[1].people, 0);
  assert.equal(summaries[3].openTasks, 0);
});
