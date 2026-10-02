# CareGrid + ThingsBoard

CareGrid owns patient records, monitoring consent, care plans, clinicians, follow-up tasks,
review history and audit records. ThingsBoard owns device credentials, connectivity,
MQTT/HTTP ingestion, raw time series and rule-engine alarms. The clinician UI remains CareGrid.

## What is implemented

- Administrator setup and patient/device assignment at `/platform/integrations/`.
- Authenticated telemetry forwarding at `POST /api/thingsboard/telemetry/`.
- Recovery worker using ThingsBoard REST time-series queries: `npm run thingsboard:sync`.
- Authenticated source alarm forwarding at `POST /api/thingsboard/alarms/`.
- Source alarms shown separately in `/attention/`, with version-checked local review and audit history.
- Readings flow through existing patient-assignment, timestamp, rate-limit and replay checks into existing charts and longitudinal patient records.
- Secrets are stored only as a hash in CareGrid; ThingsBoard login credentials stay in server environment variables.

This implementation does not install ThingsBoard, invent device integrations, or enable live
connectivity until the external server and its rule chains are configured. Bluetooth home devices
still need a compatible phone/gateway or verified vendor cloud integration. Patient assets and
device relations can be created in ThingsBoard using pseudonymous identifiers; the authoritative
patient assignment remains in CareGrid.

## Setup

1. Sign into CareGrid as administrator. Enrol a patient with monitoring consent.
2. Open Platform → API & Integrations. Register the ThingsBoard bridge and copy the
   one-time secret into a protected server secret store. Do not place it in GitHub or client code.
3. Create/provision a device in ThingsBoard. Copy its UUID (not its device access token).
4. In the CareGrid ThingsBoard panel, assign that UUID to the patient and select its measurement kind.
   One device UUID currently represents one measurement kind. Use separate logical ThingsBoard
   devices when a gateway provides multiple independent measurement kinds.
5. Configure the vendor/gateway decoder to publish the canonical unit-specific keys below.
6. On the ThingsBoard device, set the **server attribute** `caregridDeviceId` to its UUID.
   In a dedicated rule-chain branch for Post telemetry, add an Originator Attributes node that
   reads this server attribute into metadata (`ss_caregridDeviceId`). Add a JavaScript Script
   Transformation using `integrations/thingsboard/forward-telemetry.js`.
7. Connect that branch to a REST API Call node: POST to
   `https://YOUR_CAREGRID_HOST/api/thingsboard/telemetry/`, JSON content type,
   `Authorization: Bearer <CareGrid bridge secret>`. Preserve ThingsBoard's ordinary Save Time Series
   path on the original telemetry branch; do not save the transformed wrapper as telemetry.
   Route failures to monitored retry/dead-letter handling. Never log Authorization headers.
8. Verify delivery using synthetic data and confirm the live patient charts, receipt timestamp,
   and audit history. Then configure the recovery worker below.

## Telemetry contract

All timestamps are original measurement timestamps in Unix milliseconds, preserved end to end.
CareGrid rejects timestamps before device enrolment or more than five minutes in the future.
BP systolic and diastolic must come from the same timestamp; unrelated values are never paired.

| CareGrid kind | ThingsBoard keys | Unit |
|---|---|---|
| blood-pressure | systolic, diastolic; optional pulse | mmHg; bpm |
| glucose | glucose_mmol_l **or** glucose_mg_dl | mmol/L or mg/dL |
| continuous-glucose | cgm_mmol_l **or** cgm_mg_dl | mmol/L or mg/dL |
| spo2 | spo2; optional pulse | %; bpm |
| pulse | pulse | bpm |
| weight | weight_kg **or** weight_lb | kg or lb |
| temperature | temperature_c **or** temperature_f | °C or °F |

Example request body (replace the UUID and timestamp):

```json
{"deviceId":"11111111-1111-1111-1111-111111111111","ts":1790946000000,"values":{"systolic":123,"diastolic":81,"pulse":70}}
```

Readings have a stable event identity of measurement kind + timestamp per device. Repeating
identical content returns 200 with `duplicate:true`; a new event returns 201. Changed content
at the same event identity returns 409. Use a new timestamp for a distinct measurement.
A disabled integration, inactive patient or disabled/unassigned device cannot send readings.
Do not put names, clinical notes or other patient identifiers into telemetry payloads.

## Recovery sync

Set server-only variables in `.env.local` or the deployment's secret manager:

```dotenv
THINGSBOARD_URL=https://YOUR_THINGSBOARD_HOST
THINGSBOARD_USERNAME=YOUR_DEDICATED_SERVICE_ACCOUNT
THINGSBOARD_PASSWORD=YOUR_SERVICE_ACCOUNT_PASSWORD
CAREGRID_THINGSBOARD_SECRET=YOUR_BRIDGE_SECRET
THINGSBOARD_SYNC_HOURS=24
```

Use a dedicated ThingsBoard account restricted to this workspace's devices. The REST client
logs in with JWT, reauthenticates once after a 401, uses request timeouts and refuses redirects.
HTTPS is required except for local loopback development. It does not return credentials to browsers.

Run `npm run thingsboard:sync` on the CareGrid server with the same persistent database path.
Schedule it every five minutes using your server scheduler, with a lock to prevent overlapping runs.
For example, adapt the paths in this Linux cron entry:

```cron
*/5 * * * * cd /srv/caregrid && /usr/bin/flock -n /tmp/caregrid-thingsboard.lock /usr/bin/npm run thingsboard:sync >> /var/log/caregrid-thingsboard.log 2>&1
```

The worker replays a bounded window (default 24 hours; maximum 168). Retrying is safe. Each device
or frame error is reported and causes a nonzero exit code; valid frames still persist. Pages
that reach 10,000 points per key fail explicitly instead of silently truncating. Use a smaller
window for high-frequency feeds. Outages beyond the configured window require deliberate
backfill; automatic pagination and a durable sync cursor are not implemented.

## Source alarms

Configure a separate ThingsBoard alarm lifecycle branch to forward this wrapper, using the
same bridge secret. Map fields from your installed version's alarm message schema; use the
actual device originator UUID and the original last update timestamp. Never forward patient
names or arbitrary alarm details.

```json
{"alarmId":"22222222-2222-2222-2222-222222222222","deviceId":"11111111-1111-1111-1111-111111111111","type":"Device offline","severity":"WARNING","status":"ACTIVE_UNACK","updatedTs":1790946000000}
```

Allowed source statuses: ACTIVE_UNACK, ACTIVE_ACK, CLEARED_UNACK, CLEARED_ACK. CareGrid rejects
conflicting same-time updates, ignores stale updates and resets local review when a newer update
arrives. Reviewing an alarm records the reviewer and time in CareGrid; it does not acknowledge
or clear the ThingsBoard source alarm. Configure clinician-approved thresholds in ThingsBoard;
this bridge does not provide diagnosis, risk scoring or default medical thresholds.
Alarm recovery through REST and automatic escalation are not implemented: monitor delivery
failures and test create/update/clear forwarding before relying on the alarm view.

## Tenant boundary and deployment

The current CareGrid database is a **single workspace using SQLite**. Organisation catalogues
are not enforced tenant isolation. Use one deployment/database and dedicated ThingsBoard account
per clinic/provider for this release. A shared multi-provider SaaS release requires enforced
organisation scope on every query, assignment and credential before consolidating instances.
This integration does not claim POPIA or ISO compliance certification.

Keep patient records out of ThingsBoard where possible. Use pseudonymous asset references,
restrict the service account, retain database backups and apply your approved access/consent policies.
Device reassignment requires retiring the existing logical assignment and provisioning a new
logical device UUID so old telemetry cannot attach to a new patient.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and the browser suite.
Integration tests cover auth, deactivation, unit handling, timestamp pairing, replay conflicts,
REST authentication retry, sync persistence and alarm ordering. Live validation still requires
a real ThingsBoard instance and synthetic device messages.

Official references:
- https://thingsboard.io/docs/reference/rest-api/
- https://thingsboard.io/docs/reference/rule-engine/message-types/
- https://thingsboard.io/docs/reference/rule-engine/nodes/enrichment/originator-attributes/
