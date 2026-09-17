# Security policy

CareGrid handles connected-care workflow data and must be deployed with healthcare-appropriate operational controls.

## Supported code

Security fixes are applied to the current `main` branch. Deployments should run a commit that has passed the repository's GitHub Actions checks.

## Reporting a vulnerability

Do not place credentials, patient information, access tokens, database files or exploit details in a public issue. Report security concerns to the repository owner through an approved private channel or GitHub's private security reporting/security-advisory flow when enabled.

Include the affected commit, route or component, the security impact, and minimal reproduction information that does not contain real patient data.

## Deployment expectations

- Serve CareGrid only through HTTPS for network deployments.
- Keep `CAREGRID_ALLOW_LOCAL_SETUP=false` outside a loopback-only local environment.
- Remove the one-time setup token after the first administrator is created.
- Store the SQLite database and backups on encrypted persistent storage with restricted access.
- Keep integration bearer tokens in the approved gateway or secret manager; never commit them.
- Maintain at least two administrator accounts and test account-recovery procedures.
- Monitor `/api/health/` rather than authenticated data routes.
- Apply reverse-proxy request limits and network controls to authentication and ingestion endpoints.
- Review dependencies and CI results before each deployment.

## Product boundary

The current release does not provide MFA/SSO, vendor-managed device adapters, clinical measurement alert thresholds, emergency response, patient notifications or automated retention/deletion. These limitations must be included in deployment risk review. See `docs/RELEASE-CHECKLIST.md` and `docs/OPERATIONS.md`.
