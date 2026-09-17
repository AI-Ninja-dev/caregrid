import test from 'node:test';
import assert from 'node:assert/strict';
import { careGridClinicalPillars, careGridExistingProgrammes, careGridPlatformModules, clinicalAlertSafetyBoundary } from '../lib/platform-catalog.ts';

test('keeps CareGrid four clinical pillars and existing programmes', () => {
  assert.deepEqual(careGridClinicalPillars, ['Diabetes management','Hypertension management','Cardiovascular health','Stroke prevention']);
  assert.deepEqual(careGridExistingProgrammes, ['Glucose monitoring','Blood pressure','Heart-health monitoring','Risk-factor monitoring']);
});

test('catalogue includes broad RPM and enterprise capability set', () => {
  const keys = new Set(careGridPlatformModules.map(module => module.key));
  for (const key of ['rpm','devices','people','care-plans','population','clinical-alerts','communications','billing','assessments','analytics','ehr','api','rbac','security','patient-portal','automation']) assert.ok(keys.has(key));
  assert.equal(clinicalAlertSafetyBoundary.defaultEnabled, false);
  assert.equal(clinicalAlertSafetyBoundary.requiresGovernanceReference, true);
});
