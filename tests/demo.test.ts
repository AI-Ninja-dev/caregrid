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

test('alerts create one linked task even after completion and reset clears activity', () => {
  const created = updateWorkflow(initialWorkflow, {type:'from-alert',alertId:'A-001'});
  assert.equal(created.tasks.length, initialWorkflow.tasks.length + 1);
  const task = created.tasks.at(-1)!;
  assert.equal(task.alertId, 'A-001');
  assert.equal(task.person, 'Thandi Mokoena');
  assert.equal(task.owner, 'Unassigned');
  assert.equal(updateWorkflow(created, {type:'from-alert',alertId:'A-001'}), created);
  assert.equal(updateWorkflow(created, {type:'from-alert',alertId:'invalid'}), created);
  const assigned = updateWorkflow(created, {type:'assign',id:task.id,owner:'Clinical reviewer'});
  const completed = updateWorkflow(assigned, {type:'move',id:task.id,stage:'Completed'});
  assert.equal(updateWorkflow(completed, {type:'from-alert',alertId:'A-001'}), completed);
  assert.equal(updateWorkflow(completed, {type:'reset'}), initialWorkflow);
});

import { createDemoReport, csvCell } from '../lib/report.ts';
test('CSV escapes spreadsheet formulas, quotes and includes session workflow state', () => {
  assert.equal(csvCell('=2+2'), '"\'=2+2"');
  assert.equal(csvCell('say "hello"'), '"say ""hello"""');
  const linked = updateWorkflow(initialWorkflow, {type:'from-alert',alertId:'A-002'});
  const report = createDemoReport(linked, ['A-001']);
  assert.ok(report.includes('FICTIONAL DATA ONLY'));
  assert.ok(report.includes('"T-004"'));
  assert.ok(report.includes('"Acknowledged"'));
  assert.ok(report.includes('Follow-up created from A-002'));
});

import { parseRoute, routeHash } from '../lib/navigation.ts';
test('navigation validates IDs and preserves patient review scopes',()=>{
 assert.deepEqual(parseRoute('#/people/CG-001'),{view:'People',personId:'CG-001',alertPersonId:null});
 assert.deepEqual(parseRoute('#/alerts?person=CG-003'),{view:'Alerts',personId:null,alertPersonId:'CG-003'});
 assert.equal(parseRoute('#/people/unknown').personId,null);
 assert.equal(parseRoute('#/alerts?person=unknown').alertPersonId,null);
 assert.equal(parseRoute('#/invalid').view,'Overview');
 assert.equal(routeHash(parseRoute('#/alerts?person=CG-002')),'#/alerts?person=CG-002');
});
