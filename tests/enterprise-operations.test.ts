import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrateEnterpriseCareOperations } from '../lib/server/enterprise-schema.ts';
import { enterpriseMutate, enterpriseSnapshot } from '../lib/server/enterprise-operations.ts';
import type { User } from '../lib/server/store.ts';

function setup(){
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE people(id TEXT PRIMARY KEY,name TEXT); CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT);`);
  db.prepare('INSERT INTO people(id,name) VALUES(?,?)').run('p1','Test Person');
  db.prepare('INSERT INTO users(id,email) VALUES(?,?)').run('u1','admin@example.test');
  migrateEnterpriseCareOperations(db);
  return db;
}
const admin={id:'u1',email:'admin@example.test',role:'admin'} satisfies User;

test('care operations persist against an existing CareGrid person',()=>{
  const db=setup(); const audit:string[]=[];
  enterpriseMutate(db,admin,{action:'programme-enrolment',personId:'p1',programme:'Glucose monitoring',pillar:'Diabetes management'},(a)=>audit.push(a));
  enterpriseMutate(db,admin,{action:'communication',personId:'p1',channel:'phone',direction:'outbound',outcome:'Reached patient'},(a)=>audit.push(a));
  enterpriseMutate(db,admin,{action:'care-time',personId:'p1',activityType:'Care coordination',durationSeconds:'300'},(a)=>audit.push(a));
  const snapshot=enterpriseSnapshot(db);
  assert.equal(snapshot.programmeEnrollments.length,1);
  assert.equal(snapshot.communications.length,1);
  assert.equal(snapshot.careTime.length,1);
  assert.deepEqual(audit,['programme-enrolment','communication','care-time']);
});

test('clinical alert rule is registered disabled with governance reference',()=>{
  const db=setup();
  enterpriseMutate(db,admin,{action:'clinical-alert-rule',name:'Governed test rule',metric:'blood-pressure',rule:'{"source":"approved"}',governanceReference:'CLIN-GOV-001'},()=>{});
  const row=db.prepare('SELECT enabled,governance_reference FROM clinical_alert_rules').get() as {enabled:number;governance_reference:string};
  assert.equal(row.enabled,0);
  assert.equal(row.governance_reference,'CLIN-GOV-001');
});

test('API client returns its secret once and stores only a hash',()=>{
  const db=setup();
  const result=enterpriseMutate(db,admin,{action:'api-client',name:'Test client',scopes:'["read:people"]'},()=>{}) as {clientId:string;secret:string};
  assert.ok(result.secret.length>20);
  const row=db.prepare('SELECT client_key_hash FROM api_clients WHERE id=?').get(result.clientId) as {client_key_hash:string};
  assert.notEqual(row.client_key_hash,result.secret);
});
