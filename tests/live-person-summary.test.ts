import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ClinicalStore } from '../lib/server/live-store.ts';

test('live snapshot exposes person workflow summaries', () => {
  const store = new ClinicalStore(':memory:');
  const admin = store.setup('admin@example.com', 'very-long-test-password');
  store.mutate(admin, {
    action: 'person',
    name: 'Example Person',
    town: 'Cape Town',
    consent: true,
    pillar: 'Diabetes management',
    programme: 'Glucose monitoring',
  });
  const person = store.snapshot(admin).people[0] as Record<string, unknown>;
  store.mutate(admin, { action: 'task', personId: person.id, title: 'Review onboarding' });

  const snapshot = store.snapshot(admin);
  const summary = snapshot.personSummaries.find(item => item.personId === person.id);
  assert.ok(summary);
  assert.deepEqual(summary.tasks, { open: 1, unassigned: 1 });
  assert.deepEqual(summary.devices, { total: 0, enabled: 0 });
  assert.equal(summary.latestReadingAt, null);
});
