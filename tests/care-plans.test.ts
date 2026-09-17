import assert from 'node:assert/strict';
import test from 'node:test';
import { clinicalPillars, planCountByPillar, planCountByStatus, plansForPatient, plansForPillar, sampleCarePlans, updatePlanStatus } from '../lib/care-plans.ts';

test('returns only the requested person’s care plan', () => {
  assert.deepEqual(plansForPatient(sampleCarePlans, 'CG-003').map((plan) => plan.id), ['CP-003']);
});

test('returns plans for a clinical pillar', () => {
  assert.deepEqual(plansForPillar(sampleCarePlans, 'Diabetes management').map((plan) => plan.id), ['CP-001', 'CP-003']);
});

test('keeps all four CareGrid clinical pillars visible even when a demo pillar has no plans', () => {
  assert.deepEqual(clinicalPillars.map((pillar) => pillar.name), ['Diabetes management', 'Hypertension management', 'Cardiovascular health', 'Stroke prevention']);
  assert.deepEqual(planCountByPillar(sampleCarePlans), {
    'Diabetes management': 2,
    'Hypertension management': 2,
    'Cardiovascular health': 0,
    'Stroke prevention': 0,
  });
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