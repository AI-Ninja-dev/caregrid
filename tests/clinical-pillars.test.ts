import assert from 'node:assert/strict';
import test from 'node:test';
import { clinicalPillars, planCountByPillar, sampleCarePlans } from '../lib/care-plans.ts';
import { alerts, filterPatients, patients } from '../lib/demo.ts';

const names = clinicalPillars.map(item => item.name);

test('CareGrid exposes exactly the four agreed clinical pillars', () => {
  assert.deepEqual(names, [
    'Diabetes management',
    'Hypertension management',
    'Cardiovascular health',
    'Stroke prevention',
  ]);
});

test('fictional workspace represents every clinical pillar', () => {
  for (const pillar of names) {
    assert.ok(patients.some(person => person.pillar === pillar), `${pillar} should have at least one fictional profile`);
    assert.ok(filterPatients('', pillar).every(person => person.pillar === pillar));
  }
});

test('pillar filtering also searches pathway and programme language', () => {
  assert.equal(filterPatients('cardiovascular', 'All pillars').length, 2);
  assert.equal(filterPatients('risk-factor', 'All pillars').length, 2);
  assert.equal(filterPatients('cape town', 'Cardiovascular health').map(person => person.id).join(','), 'CG-005');
});

test('alerts only reference known fictional profiles and span prevention pathways', () => {
  for (const alert of alerts) assert.ok(patients.some(person => person.id === alert.patientId));
  assert.ok(alerts.some(alert => patients.find(person => person.id === alert.patientId)?.pillar === 'Cardiovascular health'));
  assert.ok(alerts.some(alert => patients.find(person => person.id === alert.patientId)?.pillar === 'Stroke prevention'));
});

test('care plan pillar counts retain empty pathways instead of dropping them', () => {
  assert.deepEqual(planCountByPillar(sampleCarePlans), {
    'Diabetes management': 2,
    'Hypertension management': 2,
    'Cardiovascular health': 0,
    'Stroke prevention': 0,
  });
});
