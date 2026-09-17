import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrateEnterpriseCareOperations } from '../lib/server/enterprise-schema.ts';
import { searchWorkspace } from '../lib/server/search.ts';

test('search spans people, devices, plans, tasks and enterprise records',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE people(id TEXT PRIMARY KEY,name TEXT,town TEXT,pillar TEXT,programme TEXT);
    CREATE TABLE devices(id TEXT PRIMARY KEY,label TEXT,kind TEXT);
    CREATE TABLE care_plans(id TEXT PRIMARY KEY,focus TEXT,goals TEXT,pillar TEXT,status TEXT);
    CREATE TABLE tasks(id TEXT PRIMARY KEY,title TEXT,stage TEXT);
  `);
  migrateEnterpriseCareOperations(db);
  db.prepare('INSERT INTO people VALUES(?,?,?,?,?)').run('p1','Nomsa Dlamini','Cape Town','Diabetes management','Glucose monitoring');
  db.prepare('INSERT INTO devices VALUES(?,?,?)').run('dev-1','Nomsa glucose meter','glucose');
  db.prepare('INSERT INTO care_plans VALUES(?,?,?,?,?)').run('plan-1','Glucose follow-up','Support glucose monitoring','Diabetes management','Active');
  db.prepare('INSERT INTO tasks VALUES(?,?,?)').run('task-1','Call Nomsa','Open');
  db.prepare('INSERT INTO providers(id,name,provider_type,created_at) VALUES(?,?,?,?)').run('pr1','Nomsa Care Team','nurse',new Date().toISOString());
  const results=searchWorkspace(db,'Nomsa');
  assert.ok(results.some(row=>row.type==='person'));
  assert.ok(results.some(row=>row.type==='device'));
  assert.ok(results.some(row=>row.type==='task'));
  assert.ok(results.some(row=>row.type==='provider'));
});
