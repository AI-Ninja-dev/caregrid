import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../lib/server/store.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('stored care plans enforce ownership, version checks and idempotent task links',()=>{
 const {s,u,p}=fixture();
 try{
  const fields={action:'plan',personId:p.id,focus:'Device support',owner:u.id,cadence:'Weekly',goals:'Review connectivity with the care team',nextReview:'2026-10-01',status:'Active'};
  assert.throws(()=>s.mutate(u,{...fields,owner:'missing'}));
  assert.throws(()=>s.mutate(u,{...fields,nextReview:'2026-02-30'}));
  s.mutate(u,fields);const plan=s.snapshot(u).plans[0];
  const task=s.mutate(u,{action:'plan-task',id:plan.id,version:1});
  assert.deepEqual(s.mutate(u,{action:'plan-task',id:plan.id,version:1}),task);
  assert.equal(s.snapshot(u).tasks.length,1);
  s.mutate(u,{action:'plan-review',id:plan.id,version:1,note:'Connection route reviewed',nextReview:'2026-10-08'});
  assert.equal(s.snapshot(u).planReviews.length,1);
  assert.equal(s.snapshot(u).plans[0].version,2);
  assert.throws(()=>s.mutate(u,{...fields,action:'plan-update',id:plan.id,version:1}));
  s.mutate(u,{...fields,action:'plan-update',id:plan.id,version:2,status:'Paused'});
  assert.throws(()=>s.mutate(u,{action:'plan-task',id:plan.id,version:3}));
 }finally{s.db.close();}
});

test('recovery tokens are administrator-issued, expiring, single-use and revoke sessions',()=>{
 const {s,u}=fixture();
 try{
  const reviewer=s.createUser('recover@example.test','recovery-test-password','reviewer');
  const session=s.login(reviewer.email,'recovery-test-password');
  assert.throws(()=>s.mutate(reviewer,{action:'recovery',id:u.id,currentPassword:'recovery-test-password'}));
  assert.throws(()=>s.mutate(u,{action:'recovery',id:reviewer.id,currentPassword:'incorrect-password'}));
  const issued=s.mutate(u,{action:'recovery',id:reviewer.id,currentPassword:'a-long-test-password'});
  assert.equal(s.user(session),undefined);
  s.recover(issued.recoveryToken,'new-recovered-password');
  assert.ok(s.login(reviewer.email,'new-recovered-password'));
  assert.throws(()=>s.recover(issued.recoveryToken,'yet-another-password'));
  const expired=s.mutate(u,{action:'recovery',id:reviewer.id,currentPassword:'a-long-test-password'});
  s.db.prepare('UPDATE recovery_tokens SET expires=0').run();
  assert.throws(()=>s.recover(expired.recoveryToken,'yet-another-password'));
 }finally{s.db.close();}
});

test('file-backed records survive database reopening', () => {
 const directory = mkdtempSync(join(tmpdir(), 'caregrid-test-'));
 const path = join(directory, 'workspace.sqlite');
 try {
  const first = new Store(path);
  const user = first.setup('persistent@example.test', 'persistent-test-password');
  first.mutate(user, {action:'person',name:'Persistent test',town:'Cape Town',consent:true});
  first.db.close();
  const second = new Store(path);
  try { assert.equal(second.snapshot(user).people.length, 1); assert.ok(second.login(user.email, 'persistent-test-password')); }
  finally { second.db.close(); }
 } finally { rmSync(directory, {recursive:true,force:true}); }
});

test('disabled accounts and password changes revoke existing sessions', () => {
 const {s,u}=fixture();
 try {
  const reviewer=s.createUser('disabled@example.test','disabled-test-password','reviewer');
  const session=s.login(reviewer.email,'disabled-test-password');
  s.mutate(u,{action:'user-status',id:reviewer.id,active:false});
  assert.equal(s.user(session),undefined);
  assert.throws(()=>s.login(reviewer.email,'disabled-test-password'));
  assert.throws(()=>s.mutate(u,{action:'user-status',id:u.id,active:false}));
  const ownerSession=s.login(u.email,'a-long-test-password');
  s.mutate(u,{action:'password',currentPassword:'a-long-test-password',password:'changed-long-password'});
  assert.equal(s.user(ownerSession),undefined);
  assert.ok(s.login(u.email,'changed-long-password'));
 } finally {s.db.close();}
});
function fixture(){const s=new Store(':memory:');const u=s.setup('owner@example.test','a-long-test-password');s.mutate(u,{action:'person',name:'Test Person',town:'Cape Town',consent:true});const p=s.snapshot(u).people[0];const credential=s.mutate(u,{action:'integration',id:'test-adapter',name:'Test gateway'});s.mutate(u,{action:'device',id:'test-device',label:'Test oximeter',personId:p.id,adapterId:'test-adapter',kind:'spo2'});return {s,u,p,credential};}
test('authentication persists sessions and rejects wrong credentials and duplicate setup',()=>{const {s,u}=fixture();try{const session=s.login(u.email,'a-long-test-password');assert.equal(s.user(session)?.id,u.id);assert.throws(()=>s.login(u.email,'incorrect-password'));assert.throws(()=>s.setup('other@example.test','another-long-password'));s.logout(session);assert.equal(s.user(session),undefined);}finally{s.db.close();}});
test('ingestion checks credentials, deduplicates atomically, rejects conflicts and paused consent',()=>{const {s,u,p,credential}=fixture();try{const r={source:'test-adapter',sourceEventId:'e1',deviceId:'test-device',measuredAt:new Date().toISOString(),measurement:{kind:'spo2',value:98,unit:'%'}};assert.throws(()=>s.ingest('test-adapter','bad',r));assert.equal(s.ingest('test-adapter',String(credential.secret),r).duplicate,false);assert.equal(s.ingest('test-adapter',String(credential.secret),r).duplicate,true);assert.equal(s.snapshot(u).readings.length,1);assert.throws(()=>s.ingest('test-adapter',String(credential.secret),{...r,measurement:{kind:'spo2',value:97,unit:'%'}}));assert.throws(()=>s.ingest('test-adapter',String(credential.secret),{...r,sourceEventId:'e2',measuredAt:'2030-01-01T00:00:00Z'}));s.mutate(u,{action:'person-status',id:p.id,active:false});assert.throws(()=>s.ingest('test-adapter',String(credential.secret),{...r,sourceEventId:'e3'}));assert.equal(s.snapshot(u).readings.length,1);}finally{s.db.close();}});
test('reviewers cannot administer workspace and tasks require ownership',()=>{const {s,u,p}=fixture();try{const reviewer=s.createUser('reviewer@example.test','another-long-password','reviewer');assert.throws(()=>s.mutate(reviewer,{action:'person',name:'Other',town:'CT',consent:true}));s.mutate(reviewer,{action:'task',personId:p.id,title:'Review connection'});const t=s.snapshot(u).tasks[0];assert.throws(()=>s.mutate(reviewer,{action:'task-update',id:t.id,stage:'Completed',owner:''}));s.mutate(reviewer,{action:'task-update',id:t.id,stage:'Completed',owner:reviewer.id});assert.equal(s.snapshot(u).tasks[0].stage,'Completed');assert.deepEqual(s.snapshot(reviewer).audit,[]);assert.ok(!JSON.stringify(s.snapshot(u)).includes('password'));assert.ok(!('secret' in s.snapshot(u).integrations[0]));}finally{s.db.close();}});
test('credential rotation revokes old tokens and assignments cannot be overwritten',()=>{const {s,u,p,credential}=fixture();try{assert.throws(()=>s.mutate(u,{action:'device',id:'test-device',label:'Duplicate',personId:p.id,adapterId:'test-adapter',kind:'spo2'}));const next=s.mutate(u,{action:'integration-update',id:'test-adapter',rotate:true});const r={source:'test-adapter',sourceEventId:'e1',deviceId:'test-device',measuredAt:new Date().toISOString(),measurement:{kind:'spo2',value:98,unit:'%'}};assert.throws(()=>s.ingest('test-adapter',String(credential.secret),r));assert.equal(s.ingest('test-adapter',String(next.secret),r).duplicate,false);}finally{s.db.close();}});
