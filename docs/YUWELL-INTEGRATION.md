# Yuwell automatic integration

## Confirmed requirement

Automatic readings only: Yuwell blood pressure, CGM and SpO2. Do not add manual clinical reading entry, spreadsheet import or fabricated data as a substitute for integration.

## Current boundary

`lib/ingestion/reading.ts` defines CareGrid's internal normalised reading contract. It is NOT a vendor protocol, connector or public ingestion endpoint. It preserves source event ID, device identity, timestamp/timezone and units. BP requires both systolic and diastolic values; glucose units remain explicit; SpO2 uses percentage. Validation does not judge clinical normality. Event identity is scoped to source and device for future database uniqueness enforcement.

No real readings are currently received. The existing UI still uses isolated fictional data and must not be relabelled as live.

## Required supplier details

For each exact model: country/firmware variant, app or gateway, Bluetooth/cloud capability, supported SDK or API, authorisation and pairing method, timestamp/unit semantics, unique event identity, retry/history behaviour and approved third-party data access. Bluetooth listed in an EMC interference table does not establish connectivity capability. A device's companion app does not establish a supported cloud API.

CGM needs the exact sensor/transmitter generation and regional app. BP and pulse oximeter models must specifically support data transmission. Obtain official integration documentation and a vendor sandbox or approved test device; do not reverse-engineer private user credentials or invent endpoints.

## Production sequence

1. Establish authenticated organisation accounts, role restrictions and patient-device assignments in a database.
2. Implement the supplier-approved cloud adapter or mobile/gateway SDK collector, keeping secrets server-side.
3. Authenticate the source, validate the adapter envelope, resolve device assignment server-side and quarantine unknown or ambiguous devices. Never trust a patient ID supplied by an unauthorised client.
4. Store readings and reception timestamps transactionally, enforcing source/device/event uniqueness. Keep audit provenance and isolate tenants.
5. Surface delayed, stale, failed and duplicate delivery states without manufacturing readings.
6. Enable clinical alert rules only after the responsible care service approves thresholds and response responsibilities.

## Sources reviewed

- https://en.yuwell-poctech.com/ — glucose monitoring and digital management offerings; not a public integration specification.
- https://www.yuwell.com/en/web/upload/2024/08/29/17248942714807jc0rm.pdf — pulse oximeter manufacturer manual; model-specific review required.

Pending: exact BP, CGM and SpO2 model names and app/gateway details from the owner. No supplier API access has been confirmed.
