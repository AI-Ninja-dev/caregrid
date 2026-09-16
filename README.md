# CareGrid

A connected-care workspace for HomeClinicStore, built with Next.js, TypeScript and a persistent SQLite backend. Designed for South African care teams. Readings arrive automatically from authenticated integrations; there is no manual reading-entry flow.

## Implemented

- First-run administrator setup, password sign-in, expiring server-side sessions and role checks.
- People enrolment with recorded consent attestation and monitoring pause/resume.
- Brand-independent integration registration, one-time bearer credentials, rotation and revocation.
- Device enrolment with fixed person assignments and BP, glucose/CGM or SpO2 measurement types.
- Authenticated `POST /api/readings/`, validation, atomic duplicate handling and conflicting-event rejection.
- Persistent reading history, timestamps, CSV export, owned care tasks and an administrator audit view.
- Team account creation, access disabling and password changes that revoke existing sessions.
- A separate `/demo/` route for the original fictional experience. Production workspace data starts empty.

## Run locally

Node 22.16+ is required (24 LTS recommended).

```sh
npm ci
# Copy .env.example to .env.local and configure it.
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

Open http://127.0.0.1:3001 and create your administrator account. No default credentials are provided. Keep the local server bound to loopback while local setup is enabled. Database files, local environment settings and test records are excluded from Git.

See [Operations](docs/OPERATIONS.md) for network hosting, backups, account management and release boundaries. This app now needs a Node server and persistent disk; GitHub Pages/static export cannot run it.

## Integration

Read [Generic integration](docs/GENERIC-INTEGRATION.md) for the payload format and [Operations](docs/OPERATIONS.md) for onboarding. [Yuwell research](docs/YUWELL-INTEGRATION.md) remains one possible connector path. A registered integration is not a vendor adapter: real delivery requires an approved gateway or documented supplier connection.

## Checks

```sh
npm test
npm run lint
npm run build
npm run test:browser
```

Browser tests start an isolated server on port 3010 and use a separate test database. They require Chrome. CI installs Chromium and selects that browser through `CI`.

## Release boundaries

This is a functional single-workspace release, not a completed clinical monitoring service. Vendor adapters, native Bluetooth pairing, clinical alert rules, patient notifications, emergency response, MFA/SSO, automated retention and deletion are not implemented. Reports show the most recent 500 readings; the database retains older records. Validate hosting, access controls, privacy processes, backups and device delivery before using real patient information.
