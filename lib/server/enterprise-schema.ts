import type { DatabaseSync } from 'node:sqlite';

/** Additive, idempotent schema for the expanded CareGrid platform.
 * Existing people, readings, devices, care plans, tasks, users and audit tables remain authoritative.
 */
export function migrateEnterpriseCareOperations(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organisations(id TEXT PRIMARY KEY,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sites(id TEXT PRIMARY KEY,organisation_id TEXT,name TEXT NOT NULL,address TEXT,town TEXT,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS providers(id TEXT PRIMARY KEY,organisation_id TEXT,site_id TEXT,name TEXT NOT NULL,provider_type TEXT,external_id TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS role_assignments(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,role TEXT NOT NULL,organisation_id TEXT,site_id TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS person_programmes(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,programme TEXT NOT NULL,pillar TEXT,status TEXT NOT NULL DEFAULT 'active',enrolled_at TEXT NOT NULL,ended_at TEXT,UNIQUE(person_id,programme,status));
    CREATE TABLE IF NOT EXISTS person_contacts(person_id TEXT PRIMARY KEY,phone TEXT,email TEXT,address TEXT,emergency_name TEXT,emergency_phone TEXT,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS person_conditions(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,code TEXT,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',source TEXT,recorded_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS person_medications(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,name TEXT NOT NULL,dose TEXT,frequency TEXT,status TEXT NOT NULL DEFAULT 'active',source TEXT,recorded_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS appointments(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,provider_id TEXT,site_id TEXT,starts_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'scheduled',external_id TEXT,notes TEXT);
    CREATE TABLE IF NOT EXISTS consents(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,programme TEXT,consent_type TEXT NOT NULL,version TEXT NOT NULL,status TEXT NOT NULL,recorded_at TEXT NOT NULL,recorded_by TEXT);

    CREATE TABLE IF NOT EXISTS device_catalogue(id TEXT PRIMARY KEY,manufacturer TEXT NOT NULL,model TEXT NOT NULL,device_type TEXT NOT NULL,connectivity TEXT,supported_metrics TEXT NOT NULL DEFAULT '[]',active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS device_inventory(id TEXT PRIMARY KEY,catalogue_id TEXT,device_id TEXT,serial_number TEXT,supplier TEXT,lot_number TEXT,warranty_end TEXT,lifecycle_state TEXT NOT NULL DEFAULT 'inventory',logistics_state TEXT,firmware TEXT,last_seen_at TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS device_assignments(id TEXT PRIMARY KEY,inventory_id TEXT,device_id TEXT,person_id TEXT NOT NULL,assigned_at TEXT NOT NULL,unassigned_at TEXT,assigned_by TEXT);
    CREATE TABLE IF NOT EXISTS device_shipments(id TEXT PRIMARY KEY,inventory_id TEXT,person_id TEXT,carrier TEXT,tracking_reference TEXT,status TEXT NOT NULL DEFAULT 'pending',shipped_at TEXT,delivered_at TEXT,updated_at TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS communications(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,channel TEXT NOT NULL,direction TEXT NOT NULL,subject TEXT,body TEXT,outcome TEXT,follow_up_at TEXT,author TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS patient_notifications(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,channel TEXT NOT NULL,notification_type TEXT NOT NULL,template_key TEXT,status TEXT NOT NULL DEFAULT 'queued',scheduled_at TEXT,sent_at TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS education_items(id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT,content_reference TEXT NOT NULL,pillar TEXT,programme TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS education_assignments(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,education_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'assigned',assigned_at TEXT NOT NULL,completed_at TEXT);

    CREATE TABLE IF NOT EXISTS assessments(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,instrument TEXT NOT NULL,instrument_version TEXT NOT NULL,responses TEXT NOT NULL,score REAL,status TEXT NOT NULL DEFAULT 'completed',reviewer TEXT,completed_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS care_time_entries(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,user_id TEXT NOT NULL,programme TEXT,activity_type TEXT NOT NULL,started_at TEXT NOT NULL,ended_at TEXT,duration_seconds INTEGER NOT NULL DEFAULT 0,notes TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS billing_activity(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,programme TEXT,period TEXT NOT NULL,rule_code TEXT,eligible INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'draft',amount_estimate REAL,currency TEXT,export_reference TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS billing_rules(id TEXT PRIMARY KEY,jurisdiction TEXT NOT NULL,programme TEXT,rule_code TEXT NOT NULL,definition TEXT NOT NULL,version TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS saved_cohorts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,filters TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workflow_rules(id TEXT PRIMARY KEY,name TEXT NOT NULL,trigger_type TEXT NOT NULL,conditions TEXT NOT NULL DEFAULT '{}',action_type TEXT NOT NULL,action_config TEXT NOT NULL DEFAULT '{}',scope TEXT NOT NULL DEFAULT 'operational',enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workflow_runs(id TEXT PRIMARY KEY,rule_id TEXT NOT NULL,person_id TEXT,status TEXT NOT NULL,result TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clinical_alert_rules(id TEXT PRIMARY KEY,name TEXT NOT NULL,metric TEXT NOT NULL,rule TEXT NOT NULL,governance_reference TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clinical_alerts(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,rule_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',assigned_to TEXT,acknowledged_at TEXT,resolved_at TEXT,notes TEXT,created_at TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS integration_connectors(id TEXT PRIMARY KEY,name TEXT NOT NULL,connector_type TEXT NOT NULL,endpoint TEXT,version TEXT,status TEXT NOT NULL DEFAULT 'disabled',last_success_at TEXT,last_error TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS integration_events(id TEXT PRIMARY KEY,connector_id TEXT NOT NULL,event_type TEXT NOT NULL,external_key TEXT,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,payload TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS api_clients(id TEXT PRIMARY KEY,name TEXT NOT NULL,client_key_hash TEXT NOT NULL,scopes TEXT NOT NULL DEFAULT '[]',active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS webhooks(id TEXT PRIMARY KEY,name TEXT NOT NULL,event_type TEXT NOT NULL,target_url TEXT NOT NULL,secret_hash TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS webhook_deliveries(id TEXT PRIMARY KEY,webhook_id TEXT NOT NULL,event_type TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,response_code INTEGER,last_error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS support_tickets(id TEXT PRIMARY KEY,person_id TEXT,device_id TEXT,category TEXT NOT NULL,priority TEXT NOT NULL DEFAULT 'normal',status TEXT NOT NULL DEFAULT 'open',summary TEXT NOT NULL,owner TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quality_measures(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,framework TEXT NOT NULL,definition TEXT NOT NULL,version TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS patient_documents(id TEXT PRIMARY KEY,person_id TEXT NOT NULL,document_type TEXT NOT NULL,title TEXT NOT NULL,storage_reference TEXT NOT NULL,uploaded_by TEXT,created_at TEXT NOT NULL);

    CREATE INDEX IF NOT EXISTS idx_roles_user ON role_assignments(user_id,active);
    CREATE INDEX IF NOT EXISTS idx_person_programmes_person ON person_programmes(person_id);
    CREATE INDEX IF NOT EXISTS idx_conditions_person ON person_conditions(person_id,status);
    CREATE INDEX IF NOT EXISTS idx_medications_person ON person_medications(person_id,status);
    CREATE INDEX IF NOT EXISTS idx_appointments_person ON appointments(person_id,starts_at);
    CREATE INDEX IF NOT EXISTS idx_device_assignments_person ON device_assignments(person_id);
    CREATE INDEX IF NOT EXISTS idx_communications_person ON communications(person_id,created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_person ON patient_notifications(person_id,status);
    CREATE INDEX IF NOT EXISTS idx_assessments_person ON assessments(person_id,completed_at);
    CREATE INDEX IF NOT EXISTS idx_care_time_person ON care_time_entries(person_id,started_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_person ON clinical_alerts(person_id,status);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status,priority);
    CREATE INDEX IF NOT EXISTS idx_integration_events ON integration_events(connector_id,status,created_at);
  `);
}
