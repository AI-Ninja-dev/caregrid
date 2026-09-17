import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrateClinicalPillars } from '../lib/server/schema.ts';

test('clinical pillar migration preserves existing people and care plans', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE people(id TEXT PRIMARY KEY,name TEXT NOT NULL,town TEXT NOT NULL,consent_at TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE care_plans(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,focus TEXT NOT NULL,owner TEXT NOT NULL,cadence TEXT NOT NULL,goals TEXT NOT NULL,next_review TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    INSERT INTO people(id,name,town,consent_at) VALUES('p1','Existing Person','Cape Town','2026-09-01T00:00:00.000Z');
    INSERT INTO care_plans(id,person_id,focus,owner,cadence,goals,next_review,status,created_at,updated_at) VALUES('cp1','p1','Existing plan','u1','Weekly','Existing goal','2026-09-30','Active','2026-09-01T00:00:00.000Z','2026-09-01T00:00:00.000Z');
  `);

  migrateClinicalPillars(db);
  migrateClinicalPillars(db);

  const person = db.prepare('SELECT * FROM people WHERE id=?').get('p1') as Record<string, unknown>;
  const plan = db.prepare('SELECT * FROM care_plans WHERE id=?').get('cp1') as Record<string, unknown>;
  const peopleCount = db.prepare('SELECT COUNT(*) AS count FROM people').get() as { count: number };
  const planCount = db.prepare('SELECT COUNT(*) AS count FROM care_plans').get() as { count: number };
  assert.equal(person.name, 'Existing Person');
  assert.equal(person.pillar, 'Diabetes management');
  assert.equal(person.programme, 'Glucose monitoring');
  assert.equal(plan.focus, 'Existing plan');
  assert.equal(plan.pillar, 'Diabetes management');
  assert.equal(peopleCount.count, 1);
  assert.equal(planCount.count, 1);
});

test('clinical pillar migration leaves already-upgraded schemas unchanged', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE people(id TEXT PRIMARY KEY,name TEXT NOT NULL,town TEXT NOT NULL,consent_at TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,pillar TEXT NOT NULL,programme TEXT NOT NULL);
    CREATE TABLE care_plans(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,focus TEXT NOT NULL,owner TEXT NOT NULL,cadence TEXT NOT NULL,goals TEXT NOT NULL,next_review TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,pillar TEXT NOT NULL);
  `);
  migrateClinicalPillars(db);
  assert.deepEqual((db.prepare('PRAGMA table_info(people)').all() as {name:string}[]).map(column=>column.name), ['id','name','town','consent_at','active','pillar','programme']);
  assert.deepEqual((db.prepare('PRAGMA table_info(care_plans)').all() as {name:string}[]).map(column=>column.name), ['id','person_id','focus','owner','cadence','goals','next_review','status','version','created_at','updated_at','pillar']);
});