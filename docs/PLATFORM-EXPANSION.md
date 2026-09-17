# CareGrid platform expansion

CareGrid keeps its existing connected-care programs and four clinical pillars as the clinical foundation:

- Diabetes management — Glucose monitoring
- Hypertension management — Blood pressure
- Cardiovascular health — Heart-health monitoring
- Stroke prevention — Risk-factor monitoring

The wider platform is being added additively. Existing people, devices, readings, care plans, tasks, audit, recovery and backup data remain authoritative.

## Implemented platform foundation

The repository now includes persisted models and authenticated operations for:

- organisations, sites and providers;
- expanded role assignments layered on the existing admin/reviewer authentication model;
- multi-program enrolment;
- person contact details, conditions, medications and appointments;
- versioned consent records;
- device catalogue, inventory, assignments and shipments;
- communications and patient notification queues;
- education content assignments;
- assessments and scored questionnaire results;
- care-management time tracking;
- jurisdiction-neutral billing rules and billing activity;
- saved population cohorts;
- operational workflow rules and workflow-run history;
- governed clinical alert rules and alert history;
- connector registry and integration-event history;
- API clients and webhook registrations;
- device/support tickets;
- configurable quality measures;
- patient-document references.

The authenticated workspace snapshot exposes these datasets through the existing `/api/workspace/` endpoint, and mutations continue to use the same workspace authentication, same-origin controls and audit trail.

## User-visible surfaces

- `/platform/` — expanded platform capability hub.
- `/platform/operations/` — signed-in operations console for core expanded workflows.
- `/people/`, `/people/<id>/`, `/pathways/`, `/plans/`, `/attention/` — existing focused CareGrid workspaces remain in place.
- `/api/platform/` — machine-readable platform capability catalogue.

## Monitoring model

The expanded measurement model is designed for blood pressure, blood glucose, CGM, weight, SpO2, pulse, temperature, spirometry, ECG, medication adherence and activity/therapeutic adherence. Existing ingestion validation and duplicate-event protections remain authoritative until each new device adapter is verified end to end.

## Clinical alert safety boundary

Operational attention and clinical alerts remain separate.

Clinical rules are stored disabled by default and require a governance reference. The software must not invent diagnosis, treatment or emergency thresholds. A clinical rule can only be activated after the relevant organisation has approved its clinical logic, data source, escalation pathway and response workflow.

## Integration architecture

The connector registry is deliberately vendor-neutral and can represent FHIR, HL7, REST, device-cloud and gateway connectors. Registering a connector does not claim an external system is integrated. Production connector certification requires credentials, mapping, retry/error handling, end-to-end tests and data-governance approval for the specific external system.

## Billing architecture

Billing is jurisdiction-neutral. Rule definitions are versioned and start inactive. CareGrid should support South African medical-scheme workflows and international reimbursement models without putting US-only CPT assumptions into the core clinical architecture.

## Security and tenancy

The existing session, password, recovery, audit, backup and security-header controls remain active. Expanded role assignments introduce organisation/site scope without weakening the existing administrator/reviewer authorization path. Before multi-tenant production use, every expanded endpoint must enforce its organisation and site scope consistently and receive dedicated access-boundary tests.

## External dependencies still required for production-grade completion

Some capabilities cannot be proven solely through repository code. They require contracted or configured external systems, including:

- real device supplier/gateway connectivity for every production device family;
- SMS/email/push/video providers;
- real EHR/EMR endpoints and FHIR/HL7 mapping agreements;
- patient identity and portal authentication policy;
- payer/billing interfaces;
- clinically approved threshold and escalation rules;
- production document/object storage;
- organisational privacy, retention, incident-response and breach procedures.

These are integration and governance dependencies, not reasons to replace the CareGrid platform architecture.
