import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { AppError, field, type User } from './store.ts';
import { expandedRoles } from '../platform-catalog.ts';

const now = () => new Date().toISOString();
const rows = (db: DatabaseSync, sql: string) => db.prepare(sql).all();
const admin = (user: User) => { if (user.role !== 'admin') throw new AppError('Administrator access is required.', 403); };
const person = (db: DatabaseSync, id: string) => { if (!db.prepare('SELECT id FROM people WHERE id=?').get(id)) throw new AppError('Person not found.', 404); };
const nullable = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value.trim() : fallback;
const jsonText = (value: unknown, fallback: unknown = {}) => {
  if (typeof value === 'string') { const trimmed=value.trim(); if (!trimmed) return JSON.stringify(fallback); try { JSON.parse(trimmed); return trimmed; } catch { return JSON.stringify({ value: trimmed }); } }
  return JSON.stringify(value ?? fallback);
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

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
  if (action === 'site') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO sites(id,organisation_id,name,address,town,created_at) VALUES(?,?,?,?,?,?)').run(id,nullable(data.organisationId),field(data.name,'Site'),nullable(data.address),nullable(data.town),created); audit(action,id); return {}; }
  if (action === 'provider') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO providers(id,organisation_id,site_id,name,provider_type,external_id,created_at) VALUES(?,?,?,?,?,?,?)').run(id,nullable(data.organisationId),nullable(data.siteId),field(data.name,'Provider'),nullable(data.providerType),nullable(data.externalId),created); audit(action,id); return {}; }
  if (action === 'role-assignment') { admin(user); const role=field(data.role,'Role'); if (!(expandedRoles as readonly string[]).includes(role)) throw new AppError('Choose a valid expanded role.'); const id=randomUUID(); db.prepare('INSERT INTO role_assignments(id,user_id,role,organisation_id,site_id,created_at) VALUES(?,?,?,?,?,?)').run(id,field(data.userId,'User'),role,nullable(data.organisationId),nullable(data.siteId),created); audit(action,id); return {}; }

  if (action === 'programme-enrolment') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO person_programmes(id,person_id,programme,pillar,enrolled_at) VALUES(?,?,?,?,?)').run(id,personId,field(data.programme,'Programme'),nullable(data.pillar),created); audit(action,id); return {}; }
  if (action === 'person-contact') { const personId=field(data.personId,'Person'); person(db,personId); db.prepare(`INSERT INTO person_contacts(person_id,phone,email,address,emergency_name,emergency_phone,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(person_id) DO UPDATE SET phone=excluded.phone,email=excluded.email,address=excluded.address,emergency_name=excluded.emergency_name,emergency_phone=excluded.emergency_phone,updated_at=excluded.updated_at`).run(personId,nullable(data.phone),nullable(data.email),nullable(data.address),nullable(data.emergencyName),nullable(data.emergencyPhone),created); audit(action,personId); return {}; }
  if (action === 'condition') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO person_conditions(id,person_id,code,name,source,recorded_at) VALUES(?,?,?,?,?,?)').run(id,personId,text(data.code),field(data.name,'Condition'),text(data.source,'CareGrid'),created); audit(action,id); return {}; }
  if (action === 'medication') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO person_medications(id,person_id,name,dose,frequency,source,recorded_at) VALUES(?,?,?,?,?,?,?)').run(id,personId,field(data.name,'Medication'),nullable(data.dose),nullable(data.frequency),text(data.source,'CareGrid'),created); audit(action,id); return {}; }
  if (action === 'appointment') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO appointments(id,person_id,provider_id,site_id,starts_at,status,external_id,notes) VALUES(?,?,?,?,?,?,?,?)').run(id,personId,nullable(data.providerId),nullable(data.siteId),field(data.startsAt,'Appointment time'),text(data.status,'scheduled'),nullable(data.externalId),nullable(data.notes)); audit(action,id); return {}; }
  if (action === 'consent') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO consents(id,person_id,programme,consent_type,version,status,recorded_at,recorded_by) VALUES(?,?,?,?,?,?,?,?)').run(id,personId,nullable(data.programme),field(data.consentType,'Consent type'),field(data.version,'Consent version'),text(data.status,'granted'),created,user.id); audit(action,id); return {}; }

  if (action === 'device-catalogue') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO device_catalogue(id,manufacturer,model,device_type,connectivity,supported_metrics) VALUES(?,?,?,?,?,?)').run(id,field(data.manufacturer,'Manufacturer'),field(data.model,'Model'),field(data.deviceType,'Device type'),nullable(data.connectivity),jsonText(data.supportedMetrics,[])); audit(action,id); return {}; }
  if (action === 'device-inventory') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO device_inventory(id,catalogue_id,device_id,serial_number,supplier,lot_number,warranty_end,lifecycle_state,logistics_state,firmware,last_seen_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,nullable(data.catalogueId),nullable(data.deviceId),nullable(data.serialNumber),nullable(data.supplier),nullable(data.lotNumber),nullable(data.warrantyEnd),text(data.lifecycleState,'inventory'),nullable(data.logisticsState),nullable(data.firmware),nullable(data.lastSeenAt),created); audit(action,id); return {}; }
  if (action === 'device-assignment') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO device_assignments(id,inventory_id,device_id,person_id,assigned_at,assigned_by) VALUES(?,?,?,?,?,?)').run(id,nullable(data.inventoryId),nullable(data.deviceId),personId,created,user.id); audit(action,id); return {}; }
  if (action === 'device-shipment') { const id=randomUUID(); db.prepare('INSERT INTO device_shipments(id,inventory_id,person_id,carrier,tracking_reference,status,shipped_at,delivered_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,nullable(data.inventoryId),nullable(data.personId),nullable(data.carrier),nullable(data.trackingReference),text(data.status,'pending'),nullable(data.shippedAt),nullable(data.deliveredAt),created); audit(action,id); return {}; }

  if (action === 'communication') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO communications(id,person_id,channel,direction,subject,body,outcome,follow_up_at,author,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,personId,field(data.channel,'Channel'),text(data.direction,'outbound'),nullable(data.subject),nullable(data.body),nullable(data.outcome),nullable(data.followUpAt),user.id,created); audit(action,id); return {}; }
  if (action === 'notification') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO patient_notifications(id,person_id,channel,notification_type,template_key,status,scheduled_at,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,personId,field(data.channel,'Channel'),field(data.notificationType,'Notification type'),nullable(data.templateKey),text(data.status,'queued'),nullable(data.scheduledAt),created); audit(action,id); return {}; }
  if (action === 'education-item') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO education_items(id,title,category,content_reference,pillar,programme,created_at) VALUES(?,?,?,?,?,?,?)').run(id,field(data.title,'Title'),nullable(data.category),field(data.contentReference,'Content reference',1000),nullable(data.pillar),nullable(data.programme),created); audit(action,id); return {}; }
  if (action === 'education-assignment') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO education_assignments(id,person_id,education_id,assigned_at) VALUES(?,?,?,?)').run(id,personId,field(data.educationId,'Education item'),created); audit(action,id); return {}; }

  if (action === 'assessment') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); const score=data.score===undefined||data.score===''?null:Number(data.score); db.prepare('INSERT INTO assessments(id,person_id,instrument,instrument_version,responses,score,reviewer,completed_at) VALUES(?,?,?,?,?,?,?,?)').run(id,personId,field(data.instrument,'Instrument'),text(data.version,'1'),jsonText(data.responses,{}),Number.isFinite(score as number)?score:null,user.id,created); audit(action,id); return {}; }
  if (action === 'care-time') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); const seconds=Math.max(0,Number(data.durationSeconds)||0); db.prepare('INSERT INTO care_time_entries(id,person_id,user_id,programme,activity_type,started_at,duration_seconds,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,personId,user.id,nullable(data.programme),field(data.activityType,'Activity type'),text(data.startedAt,created),seconds,nullable(data.notes),created); audit(action,id); return {}; }
  if (action === 'billing-rule') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO billing_rules(id,jurisdiction,programme,rule_code,definition,version,active,created_at) VALUES(?,?,?,?,?,?,0,?)').run(id,field(data.jurisdiction,'Jurisdiction'),nullable(data.programme),field(data.ruleCode,'Rule code'),jsonText(data.definition,{}),text(data.version,'1'),created); audit(action,id); return {}; }
  if (action === 'billing-activity') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); const amount=data.amountEstimate===undefined||data.amountEstimate===''?null:Number(data.amountEstimate); db.prepare('INSERT INTO billing_activity(id,person_id,programme,period,rule_code,eligible,status,amount_estimate,currency,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,personId,nullable(data.programme),field(data.period,'Billing period'),nullable(data.ruleCode),data.eligible===true||data.eligible==='true'||data.eligible==='on'?1:0,text(data.status,'draft'),Number.isFinite(amount as number)?amount:null,nullable(data.currency),created); audit(action,id); return {}; }
  if (action === 'cohort') { const id=randomUUID(); db.prepare('INSERT INTO saved_cohorts(id,user_id,name,filters,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id,user.id,field(data.name,'Cohort name'),jsonText(data.filters,{}),created,created); audit(action,id); return {}; }

  if (action === 'support-ticket') { const id=randomUUID(); db.prepare('INSERT INTO support_tickets(id,person_id,device_id,category,priority,summary,owner,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,nullable(data.personId),nullable(data.deviceId),field(data.category,'Category'),text(data.priority,'normal'),field(data.summary,'Summary',500),nullable(data.owner),created,created); audit(action,id); return {}; }
  if (action === 'quality-measure') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO quality_measures(id,code,name,framework,definition,version) VALUES(?,?,?,?,?,?)').run(id,field(data.code,'Measure code'),field(data.name,'Measure name'),field(data.framework,'Framework'),jsonText(data.definition,{}),text(data.version,'1')); audit(action,id); return {}; }
  if (action === 'patient-document') { const personId=field(data.personId,'Person'); person(db,personId); const id=randomUUID(); db.prepare('INSERT INTO patient_documents(id,person_id,document_type,title,storage_reference,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?)').run(id,personId,field(data.documentType,'Document type'),field(data.title,'Title'),field(data.storageReference,'Storage reference',1000),user.id,created); audit(action,id); return {}; }

  if (action === 'connector') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO integration_connectors(id,name,connector_type,endpoint,version,created_at) VALUES(?,?,?,?,?,?)').run(id,field(data.name,'Connector'),field(data.connectorType,'Connector type'),nullable(data.endpoint),nullable(data.version),created); audit(action,id); return {}; }
  if (action === 'integration-event') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO integration_events(id,connector_id,event_type,external_key,status,attempts,payload,error,created_at,updated_at) VALUES(?,?,?,?,?,0,?,?,?,?)').run(id,field(data.connectorId,'Connector'),field(data.eventType,'Event type'),nullable(data.externalKey),text(data.status,'queued'),jsonText(data.payload,{}),nullable(data.error),created,created); audit(action,id); return {}; }
  if (action === 'api-client') { admin(user); const id=randomUUID(); const secret=randomBytes(32).toString('base64url'); db.prepare('INSERT INTO api_clients(id,name,client_key_hash,scopes,created_at) VALUES(?,?,?,?,?)').run(id,field(data.name,'API client'),hash(secret),jsonText(data.scopes,[]),created); audit(action,id); return { clientId:id, secret }; }
  if (action === 'webhook') { admin(user); const id=randomUUID(); const secret=randomBytes(32).toString('base64url'); db.prepare('INSERT INTO webhooks(id,name,event_type,target_url,secret_hash,created_at) VALUES(?,?,?,?,?,?)').run(id,field(data.name,'Webhook'),field(data.eventType,'Event type'),field(data.targetUrl,'Target URL',1000),hash(secret),created); audit(action,id); return { webhookId:id, secret }; }
  if (action === 'workflow-rule') { admin(user); if (data.scope === 'clinical') throw new AppError('Clinical decisions require the governed clinical alert rules workflow.'); const id=randomUUID(); db.prepare('INSERT INTO workflow_rules(id,name,trigger_type,conditions,action_type,action_config,scope,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,field(data.name,'Rule name'),field(data.triggerType,'Trigger'),jsonText(data.conditions,{}),field(data.actionType,'Action'),jsonText(data.actionConfig,{}),'operational',created); audit(action,id); return {}; }
  if (action === 'clinical-alert-rule') { admin(user); const id=randomUUID(); db.prepare('INSERT INTO clinical_alert_rules(id,name,metric,rule,governance_reference,enabled,created_at) VALUES(?,?,?,?,?,0,?)').run(id,field(data.name,'Rule name'),field(data.metric,'Metric'),jsonText(data.rule,{}),field(data.governanceReference,'Governance reference',500),created); audit(action,id); return {}; }
  return null;
}
