import type { DatabaseSync } from 'node:sqlite';
import { migrationDefaults } from './clinical.ts';

function columns(db: DatabaseSync, table: string) {
  return new Set((db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(column => column.name));
}

export function migrateClinicalPillars(db: DatabaseSync) {
  const defaults = migrationDefaults();
  const people = columns(db, 'people');
  if (!people.has('pillar')) db.exec(`ALTER TABLE people ADD COLUMN pillar TEXT NOT NULL DEFAULT '${defaults.pillar.replaceAll("'", "''")}'`);
  if (!people.has('programme')) db.exec(`ALTER TABLE people ADD COLUMN programme TEXT NOT NULL DEFAULT '${defaults.programme.replaceAll("'", "''")}'`);

  const plans = columns(db, 'care_plans');
  if (!plans.has('pillar')) db.exec(`ALTER TABLE care_plans ADD COLUMN pillar TEXT NOT NULL DEFAULT '${defaults.pillar.replaceAll("'", "''")}'`);
}
