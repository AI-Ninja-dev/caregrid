import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ClinicalStore } from '../lib/server/live-store.ts';

test('live snapshot exposes operational workflow attention', () => {
  const store = new ClinicalStore(':memory:');
  const admin = store.setup('admin@example.com', 'very-long-test-password');
  store.mutate(admin, {
    action: 'person',
    name: 'Example Person',
    town: 'Cape Town',
    consent: true,
    pillar: 'Hypertension management',
    programme: 'Blood pressure',
  });
  const person = store.snapshot(admin).people[0] as Record<string, unknown>;
  store.mutate(admin, { action: 'integration', id: 'clinic-gateway-adapter', name: 'Clinic gateway' });
  store.mutate(admin, {
    action: 'device',
    id: 'device-1',
    label: 'Home monitor',
    personId: person.id,
    adapterId: 'clinic-gateway-adapter',
    kind: 'blood-pressure',
  });
  store.mutate(admin, { action: 'task', personId: person.id, title: 'Arrange follow-up' });
  store.mutate(admin, {
    action: 'plan',
    personId: person.id,
    focus: 'Connected monitoring',
    owner: admin.id,
    cadence: 'Weekly review',
    goals: 'Review incoming context',
    nextReview: '2026-09-01',
    status: 'Active',
  });

  const snapshot = store.snapshot(admin);
  assert.deepEqual(snapshot.attention.map(item => item.kind).sort(), [
    'device-awaiting-reading',
    'plan-review-due',
    'task-unassigned',
  ]);
});
