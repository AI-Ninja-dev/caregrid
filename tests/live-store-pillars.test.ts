import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ClinicalStore } from '../lib/server/live-store.ts';
import { AppError } from '../lib/server/store.ts';

test('clinical store persists pillar and programme for enrolled people', () => {
  const store = new ClinicalStore(':memory:');
  const admin = store.setup('admin@example.com', 'very-long-test-password');
  store.mutate(admin, { action: 'person', name: 'Example Person', town: 'Cape Town', consent: true, pillar: 'Cardiovascular health', programme: 'Heart-health monitoring' });
  const person = store.snapshot(admin).people[0] as Record<string, unknown>;
  assert.equal(person.pillar, 'Cardiovascular health');
  assert.equal(person.programme, 'Heart-health monitoring');
});

test('clinical store rejects programme and pillar mismatches', () => {
  const store = new ClinicalStore(':memory:');
  const admin = store.setup('admin@example.com', 'very-long-test-password');
  assert.throws(() => store.mutate(admin, { action: 'person', name: 'Example Person', town: 'Cape Town', consent: true, pillar: 'Stroke prevention', programme: 'Glucose monitoring' }), AppError);
});

test('new care plans inherit a person pillar when the form omits it', () => {
  const store = new ClinicalStore(':memory:');
  const admin = store.setup('admin@example.com', 'very-long-test-password');
  store.mutate(admin, { action: 'person', name: 'Example Person', town: 'Cape Town', consent: true, pillar: 'Hypertension management', programme: 'Blood pressure' });
  const person = store.snapshot(admin).people[0] as Record<string, unknown>;
  store.mutate(admin, { action: 'plan', personId: person.id, focus: 'Home monitoring workflow', owner: admin.id, cadence: 'Weekly review', goals: 'Review context with the care team', nextReview: '2026-10-01', status: 'Active' });
  const plan = store.snapshot(admin).plans[0] as Record<string, unknown>;
  assert.equal(plan.pillar, 'Hypertension management');
  assert.equal(plan.person_id, person.id);
});

test('clinical schema migration runs automatically when the live store opens', () => {
  const store = new ClinicalStore(':memory:');
  const peopleColumns = store.db.prepare('PRAGMA table_info(people)').all().map((column: Record<string, unknown>) => column.name);
  const planColumns = store.db.prepare('PRAGMA table_info(care_plans)').all().map((column: Record<string, unknown>) => column.name);
  assert.ok(peopleColumns.includes('pillar'));
  assert.ok(peopleColumns.includes('programme'));
  assert.ok(planColumns.includes('pillar'));
});
