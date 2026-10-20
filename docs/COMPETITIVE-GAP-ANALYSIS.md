# CareGrid RPM competitive gap analysis and execution roadmap

**Assessment date:** 20 October 2026  
**Application requested for validation:** https://app.homeclinicstore.co.za  
**Repository inspected:** https://github.com/AI-Ninja-dev/caregrid (default branch: `main`)  
**Purpose:** Evidence-based product gap assessment and safe next-step roadmap. This document is not a claim of clinical, legal, security, or production readiness.

## Executive assessment

CareGrid already has a meaningful connected-care foundation: a people directory and person profiles; four clinical pathways; consent attestation; care plans and review history; follow-up tasks; registered devices and integration credentials; authenticated reading ingestion; duplicate-event handling; longitudinal reading trends; operational attention; CSV exports; audit views; account/session controls; and a fictional demo workspace.

Its current differentiator is the **patient-to-device-to-reading-to-care-plan workflow**, organised around diabetes, hypertension, cardiovascular health and stroke prevention. Preserve that connected flow.

The largest gap is not a need for a wholesale CRM rewrite. It is the distance between a solid single-workspace technical foundation and a fully operational, clinically governed RPM service: robust clinician work queues; approved clinical alert protocols and escalation; patient communication; onboarding and adherence workflows; verified vendor adapters; integration and delivery observability; enterprise identity and organisation boundaries; and production release evidence.

**Current maturity verdict:** promising early-stage connected-care workspace, not yet equivalent to an established enterprise RPM platform or Salesforce Health Cloud. Treat the scorecard below as a source-code/repository assessment, not a full live usability certification: the requested custom domain could not be independently inspected through the available browser/web inspection channel during this run.

## Evidence and limitations

### Verified from the repository README and implementation inventory

- Next.js 15, React 19 and TypeScript application; persistent SQLite is the documented deployment model.
- First-run administrator setup, password sign-in, expiring server-side sessions and role checks.
- Searchable people directory and person-level connected-care profiles.
- Consent attestation and four pathway/programme assignment.
- Device registration and authenticated reading ingestion, with validation, duplicate handling and conflicting-event rejection.
- Stored readings and trends for blood pressure, glucose/CGM, SpO2 and available pulse values.
- Care plans with owners, review dates, versioned edits, review history and linked follow-up tasks.
- An operational attention queue for devices awaiting their first reading, due care-plan reviews and unassigned follow-ups.
- Integration credential rotation/revocation, account controls, audit view, backups, health endpoint and browser hardening headers.
- Separate fictional demo workspace.

### Explicitly documented as not implemented or limited

- Vendor adapters are not provided merely by registering an integration; a real approved gateway/vendor connection is required.
- Native Bluetooth pairing is not implemented.
- Clinical measurement threshold rules, clinical risk classification and treatment recommendations are not implemented.
- Patient notifications and emergency response are not implemented.
- MFA/SSO is not implemented.
- Automated retention/deletion is not implemented.
- Current deployment documentation describes a single-organisation, single-server SQLite deployment, not a multi-tenant SaaS service.
- Reports expose the most recent 500 readings even though older records remain in the database.

### Deployment and release evidence

- The latest visible GitHub Actions run on `main` (commit `d75ba9d33e424704c87f1caf6008346ee4e37ba6`, 8 October 2026) failed at `npm audit --audit-level=high`. Its log reports 12 dependency vulnerabilities (3 moderate, 9 high); lint, typecheck, tests, build and browser tests were skipped after the audit failure. This needs to be re-run against the current dependency tree and remediated safely, without blindly applying a breaking Tailwind major upgrade.
- Railway has a CareGrid project and services linked to `AI-Ninja-dev/caregrid`. The inspected `caregrid-live` service lists `caregrid-live-production.up.railway.app`, but the service metadata returned no latest deployment and no attached persistent volume. Its documented environment variables include `CAREGRID_DB_PATH`, `CAREGRID_ORIGIN`, `CAREGRID_ALLOW_LOCAL_SETUP` and `CAREGRID_SETUP_TOKEN`.
- The Railway project also contains a staged environment patch and staged-delete validation services. Do not accept or discard that patch as part of this audit without reviewing its exact changes.
- Vercel project/domain inspection was denied by a scope/authorisation error. The custom domain `app.homeclinicstore.co.za` could not be independently inspected through the available web inspection channel.
- Therefore, no deployment, production smoke test, live-data integrity check or successful CI result is claimed in this assessment.

## Competitive comparison

Scores: 1 = absent/basic; 2 = early; 3 = functional; 4 = mature; 5 = advanced. Scores for competitors are indicative of publicly documented capabilities, not a verified hands-on product test. “NV” means not verified from accessible evidence. CareGrid scores reflect repository evidence and should not be interpreted as a clinical quality rating.

| Capability | CareGrid today | Salesforce Health Cloud | Mature RPM platforms (e.g. CoachCare / Prevounce) | Priority for CareGrid |
|---|---:|---|---|---|
| Unified patient record | 3 | Strong healthcare data model and patient context | Strong programme-centric patient view | P1: improve timeline and at-a-glance next action |
| Conditions/programmes | 3 | Configurable care management | Multiple configurable programmes and conditions | Protect four pillars; improve programme templates |
| Care plans and tasks | 3 | Care plans, goals, tasks and care-team relationships | Guided care workflows and programme operations | P1: close the loop from alert to owned intervention |
| Telemetry ingestion and history | 3 | Usually requires configuration/integrations for RPM data | Core capability with device/EHR ecosystem | P1: verified adapters, provenance and delivery monitoring |
| Clinical threshold alerts | 1 | Depends on configuration/integrations and clinical workflow | Customisable alerts/escalations are commonly documented | P0/P1: clinician-governed protocols and audit |
| Operational attention queue | 2–3 | Care orchestration can surface gaps and changes | Consolidated prioritised patient/task queues | P1: prioritised queue with owner, reason, due date and state |
| Patient messaging/reminders | 1 | Available through appropriate products/configuration | Multi-channel patient engagement is commonly documented | P1: consent-aware outreach and delivery status |
| Device onboarding/logistics | 2 | Integration/configuration dependent | Often includes device provisioning and onboarding services | P1: onboarding checklist and connector status |
| Interoperability | 2 | Broad ecosystem; FHIR/data integration capabilities vary by setup | EHR, device and API integrations vary by vendor | P1/P2: versioned API and explicit FHIR mapping plan |
| Access/security | 2–3 | Enterprise permissions and administration | Vendor-specific | P0: production deployment, least privilege, recovery and audit evidence |
| Multi-organisation SaaS | 1 | Enterprise organisation/account models | Mature vendors support organisations at scale (details vary) | P2: only after tenant isolation is designed and tested |
| Operational reporting | 2–3 | Enterprise analytics ecosystem | Programme and operational reports; some support billing workflows | P2: adherence, follow-up and programme operations |
| Enterprise release evidence | 1–2 | Mature deployment ecosystem | Vendor-specific operational support | P0: green CI, persistent storage, backup/restore rehearsal, live smoke test |

## What CareGrid should learn — without copying competitors

1. **Salesforce Health Cloud:** connected patient context, care-team relationships, configurable care plans, tasks and care orchestration. Do not recreate a general-purpose CRM's entire object catalogue.
2. **CoachCare:** task-driven consolidated patient queues, multi-programme/device views, bulk operational actions, patient engagement and integration workflows.
3. **Prevounce:** guided patient/programme operations, device provisioning, monitoring workflows, reporting and the importance of operational support around the software.

Public references:
- Salesforce Health Cloud care orchestration: https://help.salesforce.com/s/articleView?id=ind.hc_care_orchestration.htm&language=en_US&type=5
- Salesforce care management and care plans: https://help.salesforce.com/s/articleView?id=sf.landing_care_plans.htm&language=en_US&type=5
- Salesforce Data 360 for Health Cloud: https://help.salesforce.com/s/articleView?id=ind.hc_admin_data_cloud_for_health_cloud.htm&language=en_US&type=5
- CoachCare RPM: https://www.coachcare.com/programs/remote-patient-monitoring/
- CoachCare care-management platform: https://www.coachcare.com/
- Prevounce software: https://www.prevounce.com/software
- Prevounce remote care management: https://www.prevounce.com/software/remote-care-management

## Prioritised roadmap

### P0 — Release and safety foundations

1. **Restore a trustworthy CI baseline.** Run `npm ci`, `npm audit`, lint, typecheck, unit tests, production build and browser tests on a controlled branch. Resolve dependency advisories using compatible patched versions and update the lockfile. Do not use `npm audit fix --force` without a compatibility review.
2. **Prove the actual production deployment.** Establish whether `app.homeclinicstore.co.za` targets Railway, Vercel or another host. Verify the exact source branch/commit, deployment status, health endpoint and application origin.
3. **Verify persistent storage and recovery.** The documented app uses SQLite and requires persistent encrypted storage with one writer. Confirm a durable volume exists, backup succeeds, backup integrity is verified and a restore rehearsal works before real patient data is used.
4. **Reconfirm production setup and access controls.** Ensure local setup is disabled on network deployments, the setup token is not exposed or left reusable, HTTPS and security headers are active, reviewer/admin permissions are tested, and two administrator recovery paths exist.
5. **Add a release smoke-test checklist.** Test sign-in, patient list/profile, care plan, task, reading ingestion, duplicate rejection, role permissions and health endpoint on the exact deployed commit.

### P1 — The core RPM experience

6. **Close the loop for every actionable attention item.** Provide owner, priority/reason, created time, status, acknowledgement, next action, due date and resolution note where relevant. Keep operational attention distinct from clinical alerts.
7. **Build clinician work queues.** Filters for unassigned, due today, overdue, device not reporting, plan review due and unresolved alert; saved views and caseload ownership. Never imply a clinical risk level unless a clinically governed rule actually produced it.
8. **Strengthen the patient 360 timeline.** Combine pathway, assigned clinician, device/connectivity state, last reading timestamp, trend links, open tasks, care-plan review date, communication history and next action in a concise summary.
9. **Implement clinical alerts only with governance.** Add configurable, versioned rules approved by a clinical owner; capture source data, rule version, event timestamp, acknowledgement, escalation, action and outcome. Define downtime and unacknowledged-alert handling. Do not hard-code generic thresholds or make the app an emergency response service.
10. **Add patient outreach workflow.** First track outreach attempts, preferred channel, consent, result and follow-up task. Integrate SMS/email/WhatsApp only after provider, consent, delivery status, privacy and cost are assessed.
11. **Connector reliability.** Show last successful delivery, last event, errors, retries, credential expiry/rotation status and device assignment. Test duplicate and out-of-order events, timezone handling, units and stale-source data.

### P2 — Scale and differentiation

12. **Programme templates across four pillars.** Shared workflow primitives; per-programme enrolment checklist, measurement schedule, care-plan templates, education and review cadence. Clinical rules require approval and validation.
13. **Interoperability contract.** Versioned API, documented data dictionary, provenance, idempotency, unit normalisation, FHIR mapping and explicit vendor adapter certification status.
14. **Operational outcomes.** Track enrolment completion, device delivery/connectivity, adherence, unresolved follow-ups, care-plan review completion and clinician workload. Establish baselines before setting targets.
15. **Multi-tenant architecture only when ready.** Design organisation-scoped identities, tenant-level data isolation, migrations, backup/restore and access-control tests before marketing a shared multi-tenant SaaS deployment.
16. **Data lifecycle and patient rights.** Document retention, export, correction, deletion and legal holds; implement controlled procedures and test them before claiming readiness.

## Recommended patient 360 layout

- **Header:** patient identity, programme/pillar, monitoring status, assigned care owner and safe actions.
- **Attention strip:** open workflow items with clear reason, owner, due date and status; do not show an unvalidated clinical risk score.
- **At-a-glance cards:** latest reading and timestamp, recent trend, device connectivity/last event, next care-plan review and open follow-ups.
- **Timeline:** readings, device events, care-plan edits, notes, contact attempts, tasks and alert events, each with provenance and actor.
- **Tabs or sections:** Overview, Readings & devices, Care plan, Tasks & outreach, History/audit.
- **Accessibility:** readable units and timestamps, keyboard access, clear empty/error/offline states and responsive mobile layout.

## Measurable acceptance criteria

- Every open workflow item has a stable status, owner or explicitly unassigned state, and a timestamp.
- A clinician can navigate from a patient summary to the relevant reading, care plan and follow-up without losing context.
- Every incoming reading shows measurement time, ingestion/source context and unit; duplicate event retries do not create duplicate records.
- Any future clinical alert stores rule version, source event, lifecycle history and accountable follow-up.
- Access tests prove reviewers cannot perform administrator-only mutations and one organisation cannot access another organisation's records if multi-tenancy is introduced.
- Production release is not accepted until lint, typecheck, tests, build and browser tests pass; the deployment commit is identified; health and critical user journeys pass; persistent storage and recovery are verified.
- Establish baseline measurements before setting numeric targets for queue processing time, follow-up completion, adherence or clinician time saved.

## Immediate next actions

1. Fix the failing dependency-audit gate and rerun the entire CI suite.
2. Verify the production host and map `app.homeclinicstore.co.za` to the actual deployment and repository commit.
3. Confirm persistent SQLite storage, backup integrity and restore procedure.
4. Validate the current patient 360 and attention queue against the proposed workflow.
5. Implement the first approved workflow improvement only after the release baseline is green.

## Release decision

**Do not declare this release deployed or production-ready yet.** The latest inspected CI run fails before lint/tests/build; the accessible Railway service metadata did not show a latest deployment or persistent volume; and the custom production domain could not be independently verified through the available deployment inspection channel. These are blockers to safe deployment verification, not evidence that all live functionality is broken.

Keep CareGrid's distinctive flow and four clinical pillars. Prioritise a reliable, auditable reading-to-action-to-follow-up experience over a wholesale CRM rewrite or unvalidated AI/clinical risk scoring.
