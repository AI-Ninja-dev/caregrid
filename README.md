# CareGrid

A connected-care workspace for HomeClinicStore, built with Next.js, TypeScript and a persistent SQLite backend. Designed for South African care teams. Readings arrive automatically from authenticated integrations; there is no manual reading-entry flow.

CareGrid is organised around four clinical pathways: **Diabetes management, Hypertension management, Cardiovascular health, and Stroke prevention**. These pathways organise people, care plans, review workflows and dashboard views. They are workflow classifications and do not diagnose a person or automatically determine treatment.

## Implemented

- First-run administrator setup, password sign-in, expiring server-side sessions and role checks.
- People enrolment with recorded consent attestation, clinical pillar/programme assignment and monitoring pause/resume.
- Safe schema migration for existing SQLite workspaces, preserving existing people, devices, readings, tasks, plans and review history while adding clinical-pathway fields.
- Brand-independent integration registration, one-time bearer credentials, rotation and revocation.
- Device enrolment with fixed person assignments and BP, glucose/CGM or SpO2 measurement types.
- Authenticated `POST /api/readings/`, validation, atomic duplicate handling and conflicting-event rejection.
- Persistent reading history, timestamps, CSV export, owned care tasks and an administrator audit view.
- Team account creation, access disabling and password changes that revoke existing sessions.
- Persistent care plans with clinical pillars, owners, review dates, versioned edits, review history and linked follow-up tasks.
- A non-clinical operational attention model for devices awaiting their first reading, due care-plan reviews and unassigned follow-ups. Optional device freshness checks are only enabled when an explicit operational policy is supplied.
- Administrator-issued single-use account recovery links and verified online database backups.
- A separate `/demo/` route with fictional people spanning all four CareGrid pillars. Production workspace data starts empty.

## Clinical pathway model

The persisted workspace stores a pillar and programme for each enrolled person. Care plans also store their clinical pillar independently so one person's care-team workflow can evolve without rewriting historical device data.

Current programme mapping:

| Clinical pillar | Current programme |
| --- | --- |
| Diabetes management | Glucose monitoring |
| Hypertension management | Blood pressure |
| Cardiovascular health | Heart-health monitoring |
| Stroke prevention | Risk-factor monitoring |

Existing databases are upgraded automatically when the live CareGrid store opens. Migration is idempotent and tested to preserve existing records. Pre-pillar records receive a conservative default pathway and can later be reassigned through the validated clinical mutation layer.

See [Clinical pillars](docs/CLINICAL-PILLARS.md) for the product and safety architecture.

## Operational attention

The live workspace snapshot now includes an `attention` collection derived from existing persisted records. It is intentionally limited to workflow and data-flow conditions: an enabled device with no stored reading, a care plan that has reached its review date, or an open follow-up without an owner. A device can also be marked outside a freshness window, but only when the calling service supplies an explicit freshness duration.

Operational attention is separate from clinical alerting. CareGrid does not currently classify measurement values, infer patient risk, or generate treatment recommendations from telemetry.

## Run locally

Node 22.16+ is required (24 LTS recommended).

```sh
npm ci
# Copy .env.example to .env.local and configure it.
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

Open http://127.0.0.1:3001 and create your administrator account. No default credentials are provided. Keep the local server bound to loopback while local setup is enabled. Database files, local environment settings and test records are excluded from Git.

See [Operations](docs/OPERATIONS.md) for network hosting, backups, account management and release boundaries. This app needs a Node server and persistent disk; GitHub Pages/static export cannot run it.

## Integration

Read [Generic integration](docs/GENERIC-INTEGRATION.md) for the payload format and [Operations](docs/OPERATIONS.md) for onboarding. [Yuwell research](docs/YUWELL-INTEGRATION.md) remains one possible connector path. A registered integration is not a vendor adapter: real delivery requires an approved gateway or documented supplier connection.

## Checks

```sh
npm test
npm run lint
npm run build
npm run test:browser
npm run backup -- /path/to/protected-backups
```

Browser tests start an isolated server on port 3010 and use a separate test database. They require Chrome. CI installs Chromium and selects that browser through `CI`.

## Release boundaries

This is a functional single-workspace release, not a completed clinical monitoring service. Vendor adapters, native Bluetooth pairing, clinical measurement alert rules, patient notifications, emergency response, MFA/SSO, automated retention and deletion are not implemented. Reports show the most recent 500 readings; the database retains older records. Validate hosting, access controls, privacy processes, backups, clinical governance and device delivery before using real patient information.
