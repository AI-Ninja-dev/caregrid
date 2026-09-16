import assert from 'node:assert/strict';
import test from 'node:test';
import { planCountByStatus, plansForPatient, sampleCarePlans, updatePlanStatus } from '../lib/care-plans.ts';

test('returns only the requested person’s care plan', () => {
  assert.deepEqual(plansForPatient(sampleCarePlans, 'CG-003').map((plan) => plan.id), ['CP-003']);
});

test('updates a care-plan status without mutating other plans', () => {
  const updated = updatePlanStatus(sampleCarePlans, 'CP-003', 'Paused');
  assert.equal(updated.find((plan) => plan.id === 'CP-003')?.status, 'Paused');
  assert.equal(sampleCarePlans.find((plan) => plan.id === 'CP-003')?.status, 'Needs review');
  assert.equal(updated.find((plan) => plan.id === 'CP-001')?.status, 'Needs review');
});

test('keeps the same collection for unknown or unchanged plan updates', () => {
  assert.equal(updatePlanStatus(sampleCarePlans, 'CP-404', 'Active'), sampleCarePlans);
  assert.equal(updatePlanStatus(sampleCarePlans, 'CP-002', 'Active'), sampleCarePlans);
});

test('counts plan statuses consistently', () => {
  assert.deepEqual(planCountByStatus(sampleCarePlans), { Active: 2, 'Needs review': 2, Paused: 0 });
});