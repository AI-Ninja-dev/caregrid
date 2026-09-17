import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { AppError, field, type User } from './store.ts';
import { expandedRoles } from '../platform-catalog.ts';

const now = () => new Date().toISOString();
const rows = (db: DatabaseSync, sql: string) => db.prepare(sql).all();
const admin = (user: User) => { if (user.role !== 'admin') throw new AppError('Administrator access is required.', 403); };
const person = (db: DatabaseSync, id: string) => { if (!db.prepare('SELECT id FROM people WHERE id=?').get(id)) throw new AppError('Person not found.', 404); };

export function enterpriseSnapshot(db: DatabaseSync) {
  return {
    organisations: rows(db, 'SELECT * FROM organisations ORDER BY name'),
    sites: rows(db, 'SELECT * FROM sites ORDER BY name'),
    providers: rows(db, 'SELECT * FROM providers ORDER BY name'),
    roleAssignments: rows(db, 'SELECT * FROM role_assignments WHERE active=1 ORDER BY created_at DESC'),
    programmeEnrollments: rows(db, 'SELECT * FROM person_programmes ORDER BY enrolled_at DESC'),
    contacts: rows(db, 'SELECT * FROM person_contacts ORDER BY updated_at DESC'),
    conditions: rows(db, 'SELECT * FROM person_conditions ORDER BY recorded_at DESC'),
    medications: rows(db, 'SELECT * FROM person_medications ORDER BY recorded_at DESC'),
    appointments: rows(db, 'SELECT * FROM appointments ORDER BY starts_at'),
    consents: rows(db, 'SELECT * FROM consents ORDER BY recorded_at DESC'),
    deviceCatalogue: rows(db, 'SELECT * FROM device_catalogue ORDER BY manufacturer,model'),
    deviceInventory: rows(db, 'SELECT * FROM device_inventory ORDER BY created_at DESC'),
    deviceAssignments: rows(db, 'SELECT * FROM device_assignments ORDER BY assigned_at DESC'),
    deviceShipments: rows(db, 'SELECT * FROM device_shipments ORDER BY updated_at DESC'),
    communications: rows(db, 'SELECT * FROM communications ORDER BY created_at DESC LIMIT 500'),
    notifications: rows(db, 'SELECT * FROM patient_notifications ORDER BY created_at DESC LIMIT 500'),
    education: rows(db, 'SELECT * FROM education_items WHERE active=1 ORDER BY title'),
    educationAssignments: rows(db, 'SELECT * FROM education_assignments ORDER BY assigned_at DESC'),
    assessments: rows(db, 'SELECT * FROM assessments ORDER BY completed_at DESC LIMIT 500'),
    careTime: rows(db, 'SELECT * FROM care_time_entries ORDER BY started_at DESC LIMIT 1000'),
    billingActivity: rows(db, 'SELECT * FROM billing_activity ORDER BY period DESC,created_at DESC LIMIT 1000'),
    billingRules: rows(db, 'SELECT * FROM billing_rules WHERE active=1 ORDER BY jurisdiction,rule_code'),
    cohorts: rows(db, 'SELECT * FROM saved_cohorts ORDER BY updated_at DESC'),
    workflowRules: rows(db, 'SELECT * FROM workflow_rules ORDER BY created_at DESC'),
    workflowRuns: rows(db, 'SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT 500'),
    clinicalAlertRules: rows(db, 'SELECT * FROM clinical_alert_rules ORDER BY created_at DESC'),
    clinicalAlerts: rows(db, 'SELECT * FROM clinical_alerts ORDER BY created_at DESC LIMIT 500'),
    connectors: rows(db, 'SELECT * FROM integration_connectors ORDER BY name'),
    integrationEvents: rows(db, 'SELECT * FROM integration_events ORDER BY created_at DESC LIMIT 500'),
    apiClients: rows(db, 'SELECT id,name,scopes,active,created_at FROM api_clients ORDER BY name'),
    webhooks: rows(db, 'SELECT id,name,event_type,target_url,active,created_at FROM webhooks ORDER BY name'),
    supportTickets: rows(db, 'SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 500'),
    qualityMeasures: rows(db, 'SELECT * FROM quality_measures WHERE active=1 ORDER BY framework,code'),
    documents: rows(db, 'SELECT * FROM patient_documents ORDER BY created_at DESC LIMIT 500'),
  };
}

export function enterpriseMutate(db: DatabaseSync, user: User, data: Record<string, unknown>, audit: (action:string,subject:string)=>void) {
  const action = String(data.action || '');
  const created = now();
  if (action === 'organisation') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO organisations(id,name,created_at) VALUES(?,?,?)').run(id,field(data.name,'Organisation'),created); audit(action,id); return {}; }
  if (action === 'site') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO sites(id,organisation_id,name,address,town,created_at) VALUES(?,?,?,?,?,?)').run(id,data.organisationId||null,field(data.name,'Site'),data.address||null,data.town||null,created); audit(action,id); return {}; }
  if (action === 'provider') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO providers(id,organisation_id,site_id,name,provider_type,external_id,created_at) VALUES(?,?,?,?,?,?,?)').run(id,data.organisationId||null,data.siteId||null,field(data.name,'Provider'),data.providerType||null,data.externalId||null,created); audit(action,id); return {}; }
  if (action === 'role-assignment') { admin(user); const role=field(data.role,'Role'); if (!(expandedRoles as readonly string[]).includes(role)) throw new AppError('Choose a valid expanded role.'); const id=randomUUID(); db.prepare('INSERT INTO role_assignments(id,user_id,role,organisation_id,site_id,created_at) VALUES(?,?,?,?,?,?)').run(id,field(data.userId,'User'),role,data.organisationId||null,data.siteId||null,created); audit(action,id); return {}; }
  if (action === 'programme-enrolment') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO person_programmes(id,person_id,programme,pillar,enrolled_at) VALUES(?,?,?,?,?)').run(id,personId,field(data.programme,'Programme'),data.pillar||null,created); audit(action,id); return {}; }
  if (action === 'person-contact') { const personId=field(data.personId,'Person'); person(db,personId); db.prepare(`INSERT INTO person_contacts(person_id,phone,email,address,emergency_name,emergency_phone,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(person_id) DO UPDATE SET phone=excluded.phone,email=excluded.email,address=excluded.address,emergency_name=excluded.emergency_name,emergency_phone=excluded.emergency_phone,updated_at=excluded.updated_at`).run(personId,data.phone||null,data.email||null,data.address||null,data.emergencyName||null,data.emergencyPhone||null,created); audit(action,personId); return {}; }
  if (action === 'condition') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO person_conditions(id,person_id,code,name,source,recorded_at) VALUES(?,?,?,?,?,?)').run(id,personId,data.code||'',field(data.name,'Condition'),data.source||'CareGrid',created); audit(action,id); return {}; }
  if (action === 'medication') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO person_medications(id,person_id,name,dose,frequency,source,recorded_at) VALUES(?,?,?,?,?,?,?)').run(id,personId,field(data.name,'Medication'),data.dose||null,data.frequency||null,data.source||'CareGrid',created); audit(action,id); return {}; }
  if (action === 'communication') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO communications(id,person_id,channel,direction,subject,body,outcome,follow_up_at,author,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,personId,field(data.channel,'Channel'),data.direction||'outbound',data.subject||null,data.body||null,data.outcome||null,data.followUpAt||null,user.id,created); audit(action,id); return {}; }
  if (action === 'assessment') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO assessments(id,person_id,instrument,instrument_version,responses,score,reviewer,completed_at) VALUES(?,?,?,?,?,?,?,?)').run(id,personId,field(data.instrument,'Instrument'),String(data.version||'1'),JSON.stringify(data.responses??{}),data.score??null,user.id,created); audit(action,id); return {}; }
  if (action === 'care-time') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); const seconds=Math.max(0,Number(data.durationSeconds)||0); db.prepare('INSERT INTO care_time_entries(id,person_id,user_id,programme,activity_type,started_at,duration_seconds,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,personId,user.id,data.programme||null,field(data.activityType,'Activity type'),data.startedAt||created,seconds,data.notes||null,created); audit(action,id); return {}; }
  if (action === 'support-ticket') { const id=randomUUID(); db.prepare('INSERT INTO support_tickets(id,person_id,device_id,category,priority,summary,owner,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,data.personId||null,data.deviceId||null,field(data.category,'Category'),data.priority||'normal',field(data.summary,'Summary',500),data.owner||null,created,created); audit(action,id); return {}; }
  if (action === 'connector') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO integration_connectors(id,name,connector_type,endpoint,version,created_at) VALUES(?,?,?,?,?,?)').run(id,field(data.name,'Connector'),field(data.connectorType,'Connector type'),data.endpoint||null,data.version||null,created); audit(action,id); return {}; }
  if (action === 'workflow-rule') { admin(user); if (data.scope === 'clinical') throw new AppError('Clinical decisions require the governed clinical alert rules workflow.'); const id=randomUUID(); db.prepare('INSERT INTO workflow_rules(id,name,trigger_type,conditions,action_type,action_config,scope,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,field(data.name,'Rule name'),field(data.triggerType,'Trigger'),JSON.stringify(data.conditions??{}),field(data.actionType,'Action'),JSON.stringify(data.actionConfig??{}),'operational',created); audit(action,id); return {}; }
  if (action === 'clinical-alert-rule') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO clinical_alert_rules(id,name,metric,rule,governance_reference,enabled,created_at) VALUES(?,?,?,?,?,0,?)').run(id,field(data.name,'Rule name'),field(data.metric,'Metric'),JSON.stringify(data.rule??{}),field(data.governanceReference,'Governance reference',500),created); audit(action,id); return {}; }
  return null;
}
