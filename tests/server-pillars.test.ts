import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inferLegacyPillar,
  legacyProgrammeForPillar,
  liveClinicalPillars,
  migrationDefaults,
  programmesByPillar,
  validateClinicalPillar,
  validateProgramme,
} from '../lib/server/clinical.ts';

test('persisted workspace exposes exactly the four CareGrid clinical pillars', () => {
  assert.deepEqual(liveClinicalPillars, [
    'Diabetes management',
    'Hypertension management',
    'Cardiovascular health',
    'Stroke prevention',
  ]);
});

test('each clinical pillar has a deterministic programme mapping', () => {
  for (const pillar of liveClinicalPillars) {
    assert.ok(programmesByPillar[pillar].length > 0);
    assert.equal(legacyProgrammeForPillar(pillar), programmesByPillar[pillar][0]);
  }
});

test('pillar and programme validation rejects unsupported combinations', () => {
  assert.equal(validateClinicalPillar('Stroke prevention'), 'Stroke prevention');
  assert.equal(validateProgramme('Cardiovascular health', 'Heart-health monitoring'), 'Heart-health monitoring');
  assert.throws(() => validateClinicalPillar('Respiratory care'));
  assert.throws(() => validateProgramme('Diabetes management', 'Blood pressure'));
});

test('legacy programme inference is deterministic and conservative', () => {
  assert.equal(inferLegacyPillar('Glucose monitoring'), 'Diabetes management');
  assert.equal(inferLegacyPillar('Blood pressure'), 'Hypertension management');
  assert.equal(inferLegacyPillar('Heart-health monitoring'), 'Cardiovascular health');
  assert.equal(inferLegacyPillar('Risk-factor monitoring'), 'Stroke prevention');
  assert.equal(inferLegacyPillar('Unknown programme'), null);
  assert.equal(inferLegacyPillar(null), null);
});

test('migration defaults are stable for pre-pillar records', () => {
  assert.deepEqual(migrationDefaults(), {
    pillar: 'Diabetes management',
    programme: 'Glucose monitoring',
  });
});
