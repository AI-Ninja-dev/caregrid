# Running CareGrid

This release is a single-organisation, single-server application. Each installation owns one workspace and SQLite database. It is not a multi-tenant SaaS deployment.

## Local start

Use Node 22.16 or newer (Node 24 LTS recommended). Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run build` and `npm run start -- --hostname 127.0.0.1 --port 3001`. The first visit offers administrator creation. There are no default credentials and no seeded people or readings. The separate `/demo/` page contains fictional fixtures only.

## Network deployment

Run the Node server on a private interface behind an HTTPS reverse proxy. GitHub Pages cannot run this backend. Set `CAREGRID_ORIGIN` to the exact public origin, set `CAREGRID_ALLOW_LOCAL_SETUP=false`, and generate a random `CAREGRID_SETUP_TOKEN` in the hosting secret manager. Supply it once in the first-run form, then remove it from the environment. Do not place secrets in client-prefixed variables or Git. Ensure host headers cannot enable local setup. Configure proxy body, timeout and rate limits, especially on authentication and ingestion routes.

Use a persistent encrypted volume for `CAREGRID_DB_PATH`, with access restricted to the app's service account. The application does not encrypt SQLite itself. Do not use an ephemeral serverless filesystem or multiple independent app instances. Account, session and integration credential hashes are stored server-side. Session cookies expire after eight hours. Password changes and account disabling revoke sessions; credentials can be rotated or paused in Workspace.

## Onboarding and ingestion

1. Record a person's consent and enrol them in People.
2. Register a named integration in Workspace. Save the generated bearer token immediately; the database stores only its hash.
3. Enrol a device against that integration and person, selecting BP, glucose or SpO2.
4. Configure the approved gateway/service to POST the documented JSON format to `/api/readings/`, with bearer authorisation and `X-CareGrid-Adapter`.
5. Confirm recorded readings, source identifiers and timestamps in Reports. Updates refresh every 30 seconds while the page is visible, or via Refresh.

Incoming data before device enrolment or over five minutes in the future is rejected. Use a new connector device ID when changing the assigned person; do not reuse identifiers across assignments. Pausing monitoring, a device or an integration prevents further acceptance. Retries are idempotent; conflicting content under an existing source event ID returns 409. Current freshness handling displays measurement timestamps without classifying clinical risk. No readings can be manually entered in the UI.

## Backups and recovery

Use SQLite's online backup facility for live backups, or stop the server cleanly before copying the database. Do not copy only the main file while WAL writes are active. Store encrypted backups outside the application host, restrict access and test restoring into a separate instance. Keep deployment configuration and operator credentials in your secret manager. There is no email-based password recovery; retain another administrator account and a controlled operator recovery procedure.

## Current limits and release gates

The app now has persisted people, device assignments, readings, tasks, accounts, credential rotation, CSV export and audit events. Reviewers can read workspace data and manage care tasks; administrators manage access, enrolment and integrations. All authorised users belong to the same organisation.

Before using real patient information, the service operator must validate consent documentation, privacy/retention and deletion procedures, backup recovery, hosting access, and supplier connector behaviour with test devices. A consent checkbox is a record of an operator's attestation, not a complete consent-management system. Database audit rows are not an independently tamper-proof audit service. Recent-data screens return at most 500 readings and 100 audit events; older data remains stored but is not paginated in this release.

Vendor adapters, native Bluetooth pairing, clinical thresholds/alerts, patient notifications, emergency response, MFA/SSO and automated retention/deletion are not implemented. This release must not be described as a complete clinical monitoring service. Real device delivery still requires a verified gateway or vendor connector.

## Verification

`npm test` exercises validation, authentication, role restrictions, task ownership and ingestion. `npm run build` checks types and lint. `npm run test:browser` starts an isolated server on port 3010 with a separate temporary database and checks the demo plus the stored-workspace journey. Test data and databases are excluded from Git.
