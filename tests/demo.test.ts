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

import { initialWorkflow, updateWorkflow } from '../lib/workflow.ts';
test('unassigned tasks cannot progress until ownership is established', () => {
  assert.equal(updateWorkflow(initialWorkflow, {type:'move',id:'T-003',stage:'Completed'}), initialWorkflow);
  const assigned = updateWorkflow(initialWorkflow, {type:'assign',id:'T-003',owner:'Care coordinator'});
  const completed = updateWorkflow(assigned, {type:'move',id:'T-003',stage:'Completed'});
  assert.equal(completed.tasks[2].stage, 'Completed');
  assert.equal(completed.history.length, 2);
  assert.equal(completed.history[0].message, 'Moved from to do to completed');
  assert.equal(initialWorkflow.tasks[2].owner, 'Unassigned');
});
test('active tasks retain owners and reopened tasks preserve history', () => {
  assert.equal(updateWorkflow(initialWorkflow, {type:'assign',id:'T-002',owner:'Unassigned'}), initialWorkflow);
  const reopened = updateWorkflow(initialWorkflow, {type:'move',id:'T-002',stage:'To do'});
  const unassigned = updateWorkflow(reopened, {type:'assign',id:'T-002',owner:'Unassigned'});
  assert.equal(unassigned.tasks[1].owner, 'Unassigned');
  assert.equal(unassigned.history[0].id, 2);
  assert.equal(updateWorkflow(unassigned, {type:'assign',id:'T-002',owner:'Unassigned'}), unassigned);
  assert.equal(updateWorkflow(unassigned, {type:'move',id:'missing',stage:'Completed'}), unassigned);
});
