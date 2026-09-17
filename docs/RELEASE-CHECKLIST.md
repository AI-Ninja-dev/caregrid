# CareGrid release checklist

Use this checklist before calling a CareGrid installation ready for a controlled pilot.

## Code and automated verification

- [ ] `npm ci` completes with the approved Node version.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:browser` passes.
- [ ] `GET /api/health/` returns HTTP 200 with `{ "status": "ok", "database": "reachable" }`.
- [ ] Security headers are present on application responses.

## Hosting and secrets

- [ ] `CAREGRID_ORIGIN` is the exact HTTPS production origin.
- [ ] `CAREGRID_ALLOW_LOCAL_SETUP=false` on network deployments.
- [ ] The one-time setup token is generated outside Git, used for first setup, then removed.
- [ ] The Node service is behind an HTTPS reverse proxy.
- [ ] The SQLite database is on persistent encrypted storage with service-account-only access.
- [ ] Only one application instance writes to the SQLite database.
- [ ] Reverse-proxy request-size, timeout and rate controls are configured.
- [ ] Monitoring checks `/api/health/` without exposing workspace data.

## Access and recovery

- [ ] At least two administrator accounts exist for operational recovery.
- [ ] Reviewer permissions have been tested against administrator-only actions.
- [ ] Password recovery has been tested using the single-use recovery flow.
- [ ] Session revocation has been verified after password change and account disabling.
- [ ] Integration bearer credentials are stored only in the approved secret store or gateway configuration.

## Data and operations

- [ ] A backup has been created with `npm run backup -- <protected-path>`.
- [ ] Backup integrity and SHA-256 manifest have been verified.
- [ ] A restore has been rehearsed into an isolated database copy.
- [ ] Retention and deletion procedures are documented for the deployment even though automated retention is not yet implemented.
- [ ] Access to backups and audit exports is restricted and logged by the hosting environment.

## Connected-device verification

- [ ] Every production integration uses a verified supplier, gateway or documented connector.
- [ ] Device identifiers are unique and permanently bound to the intended CareGrid person assignment.
- [ ] Test readings have been verified end to end for each supported measurement type used by the pilot.
- [ ] Duplicate source events have been verified to be idempotent.
- [ ] Paused people, devices and integrations reject new readings as expected.
- [ ] Any operational freshness window is explicitly configured and documented; CareGrid does not infer one automatically.

## Clinical and privacy governance

- [ ] Consent wording and the process for recording consent have been approved for the pilot.
- [ ] Clinical owners have approved the four pathway workflows and care-plan review process.
- [ ] No pathway label, trend graph or operational attention item is treated as a diagnosis or treatment recommendation.
- [ ] Any future clinical measurement thresholds are defined and approved outside the software before implementation.
- [ ] Emergency escalation remains outside CareGrid unless a separately validated workflow is introduced.
- [ ] Privacy, access, incident-response and breach-handling procedures are approved for the hosting environment.

## Pilot acceptance

A controlled pilot can be considered technically ready when all applicable items above are complete and the latest `main` commit has a successful GitHub Actions run. Vendor connectivity, organisational approvals and production hosting are external release dependencies and cannot be proven by the repository alone.
