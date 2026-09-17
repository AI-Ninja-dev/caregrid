import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrateEnterpriseCareOperations } from '../lib/server/enterprise-schema.ts';

const expected = [
  'organisations','sites','providers','role_assignments','person_programmes','person_contacts','person_conditions','person_medications','appointments','consents',
  'device_catalogue','device_inventory','device_assignments','device_shipments','communications','patient_notifications','education_items','education_assignments',
  'assessments','care_time_entries','billing_activity','billing_rules','saved_cohorts','workflow_rules','workflow_runs','clinical_alert_rules','clinical_alerts',
  'integration_connectors','integration_events','api_clients','webhooks','webhook_deliveries','support_tickets','quality_measures','patient_documents'
];

test('enterprise migration is additive and idempotent', () => {
  const db = new DatabaseSync(':memory:');
  migrateEnterpriseCareOperations(db);
  migrateEnterpriseCareOperations(db);
  const tables = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name:string}[]).map(row => row.name));
  for (const name of expected) assert.ok(tables.has(name), `missing ${name}`);
});

test('clinical alert rules start disabled', () => {
  const db = new DatabaseSync(':memory:');
  migrateEnterpriseCareOperations(db);
  db.prepare('INSERT INTO clinical_alert_rules(id,name,metric,rule,governance_reference,created_at) VALUES(?,?,?,?,?,?)').run('r1','Approved BP rule','blood-pressure','{}','GOV-001',new Date().toISOString());
  const row = db.prepare('SELECT enabled,governance_reference FROM clinical_alert_rules WHERE id=?').get('r1') as {enabled:number;governance_reference:string};
  assert.equal(row.enabled, 0);
  assert.equal(row.governance_reference, 'GOV-001');
});
