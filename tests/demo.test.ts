import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alerts, patients, filterPatients, toggleAcknowledgement } from '../lib/demo.ts';
test('search matches towns and IDs and combines with programme', () => {
  assert.equal(filterPatients(' cape ', 'All programmes')[0]?.id, 'CG-001');
  assert.equal(filterPatients('CG-002', 'Glucose monitoring').length, 0);
  assert.equal(filterPatients('', 'Blood pressure').length, 2);
  assert.equal(filterPatients('no match', 'All programmes').length, 0);
});
test('acknowledgement is reversible, immutable and rejects unknown alerts', () => {
  const original: string[] = [];
  const changed = toggleAcknowledgement(original, alerts[0].id);
  assert.deepEqual(original, []);
  assert.deepEqual(changed, [alerts[0].id]);
  assert.deepEqual(toggleAcknowledgement(changed, alerts[0].id), []);
  assert.deepEqual(toggleAcknowledgement(changed, 'unknown'), changed);
});
test('sample records have valid references and device values', () => {
  assert.equal(new Set(patients.map(p=>p.id)).size, patients.length);
  for (const alert of alerts) assert.ok(patients.some(p=>p.id===alert.patientId));
  for (const p of patients) { assert.ok(p.battery >= 0 && p.battery <= 100); assert.equal(p.readings.length, 8); assert.ok(p.readings.every(Number.isFinite)); }
});
