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

import { emptySession, applyEvent, restoreSession, encodeSession } from '../lib/session.ts';
test('demo event replay restores workflows and acknowledgements without storing records',()=>{
 let session=applyEvent(emptySession(),{type:'workflow',action:{type:'from-alert',alertId:'A-001'}});
 session=applyEvent(session,{type:'workflow',action:{type:'assign',id:'T-004',owner:'Clinical reviewer'}});
 session=applyEvent(session,{type:'acknowledge',id:'A-002'});
 const raw=encodeSession(session);
 assert.ok(!raw.includes('Thandi'));
 assert.deepEqual(restoreSession(raw).session,session);
 assert.equal(restoreSession(raw).recovered,false);
 assert.deepEqual(applyEvent(session,{type:'workflow',action:{type:'reset'}}),emptySession());
});
test('invalid or untrusted session payloads recover to safe demo state',()=>{
 for(const raw of ['not json','null','{"version":8,"events":[]}',JSON.stringify({version:1,events:[{type:'workflow',action:{type:'assign',id:'T-001',owner:'Injected role'}}]})]){
  const result=restoreSession(raw);assert.equal(result.recovered,true);assert.deepEqual(result.session,emptySession());
 }
 assert.equal(restoreSession(null).recovered,false);
});

import { validateAutomaticReading, readingIdentity } from '../lib/ingestion/reading.ts';
test('automatic device contract requires complete measurements and explicit units',()=>{
 const base={source:'yuwell-adapter',sourceEventId:'event-1',deviceId:'test-device',measuredAt:'2026-09-15T09:00:00+02:00'};
 assert.equal(validateAutomaticReading({...base,measurement:{kind:'blood-pressure',systolic:120,diastolic:80,unit:'mmHg'}}).ok,true);
 assert.equal(validateAutomaticReading({...base,measurement:{kind:'blood-pressure',systolic:120,unit:'mmHg'}}).ok,false);
 assert.equal(validateAutomaticReading({...base,measurement:{kind:'glucose',value:6.1,unit:'mmol/L'}}).ok,true);
 assert.equal(validateAutomaticReading({...base,measurement:{kind:'glucose',value:110,unit:'mg/dL'}}).ok,true);
 assert.equal(validateAutomaticReading({...base,measurement:{kind:'glucose',value:6.1}}).ok,false);
 assert.equal(validateAutomaticReading({...base,source:'manual',measurement:{kind:'spo2',value:98,unit:'%'}}).ok,false);
 assert.equal(validateAutomaticReading({...base,measurement:{kind:'spo2',value:101,unit:'%'}}).ok,false);
 assert.equal(validateAutomaticReading({...base,measuredAt:'2026-09-15T09:00:00',measurement:{kind:'spo2',value:98,unit:'%'}}).ok,false);
 const valid=validateAutomaticReading({...base,measurement:{kind:'spo2',value:98,unit:'%'}});
 if(valid.ok)assert.notEqual(readingIdentity(valid.reading),readingIdentity({...valid.reading,deviceId:'another-device'}));
});

import { acceptAutomaticReading, type IntegrationContext } from '../lib/ingestion/accept.ts';
test('generic adapters bind readings to trusted organisations and device assignments',()=>{
 const payload={source:'clinic-gateway-adapter',sourceEventId:'e1',deviceId:'d1',measuredAt:'2026-09-15T09:00:00Z',personId:'injected',measurement:{kind:'spo2',value:98,unit:'%'}};
 const context:IntegrationContext={organisationId:'org1',adapterId:'clinic-gateway-adapter',enabled:true,devices:[{deviceId:'d1',personId:'p1',kinds:['spo2']}]};
 const accepted=acceptAutomaticReading(payload,context);
 assert.equal(accepted.ok,true);
 if(accepted.ok){assert.equal(accepted.personId,'p1');assert.ok(!('personId' in accepted.reading));assert.deepEqual(acceptAutomaticReading(payload,context),accepted);const other=acceptAutomaticReading(payload,{...context,organisationId:'org2'});if(other.ok)assert.notEqual(other.key,accepted.key);}
 for(const change of [{enabled:false},{adapterId:'other-adapter'},{devices:[]},{devices:[...context.devices,...context.devices]},{devices:[{deviceId:'d1',personId:'p1',kinds:[] as const}]}])assert.equal(acceptAutomaticReading(payload,{...context,...change}).ok,false);
 assert.equal(acceptAutomaticReading({...payload,source:'manual'},context).ok,false);
 assert.equal(validateAutomaticReading({...payload,source:'another-provider-adapter'}).ok,true);
});

test('device timestamps reject impossible calendar dates',()=>{for(const measuredAt of ['2026-02-30T09:00:00Z','2026-09-16T24:01:00Z','2026-09-16T09:00:00+14:30'])assert.equal(validateAutomaticReading({source:'test-adapter',sourceEventId:'e1',deviceId:'d1',measuredAt,measurement:{kind:'spo2',value:98,unit:'%'}}).ok,false);});
