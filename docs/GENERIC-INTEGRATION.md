# Automatic integrations across brands

CareGrid accepts a common internal format from device gateways or cloud connectors. Adapters translate documented vendor payloads into this format. Naming an adapter does not establish hardware compatibility. Manual entry and CSV readings are outside this interface.

```json
{
  "source": "clinic-gateway-adapter",
  "sourceEventId": "measurement-0042",
  "deviceId": "device-017",
  "measuredAt": "2026-09-15T09:00:00+02:00",
  "measurement": {
    "kind": "blood-pressure",
    "systolic": 120,
    "diastolic": 80,
    "unit": "mmHg",
    "pulse": 72
  }
}
```

Other measurements: `glucose` with `value` and `mmol/L` or `mg/dL`; `spo2` with `value`, `%`, and optional `pulse`. Keep the original unit. CGM and connected glucose meters can use the glucose measurement; the connector must preserve device provenance. No clinical interpretation or alert thresholds are applied here.

## Implemented

- `lib/ingestion/reading.ts`: structural validation and canonical payload construction; discards unknown fields, including caller-supplied person or organisation IDs.
- `lib/ingestion/accept.ts`: requires an enabled trusted integration context, matching adapter ID, exactly one device/person assignment and an allowed measurement kind.
- The acceptance result includes an organisation-scoped event key. Repeated delivery yields the same key; this is not yet a database duplicate check.

## Production transport boundary

The Node backend now exposes POST /api/readings/. It authenticates a hashed bearer credential and X-CareGrid-Adapter header, loads enabled assignments server-side, and calls the acceptance gate. It stores the reading and event key atomically under a unique constraint. Retries return 200 without adding records; conflicting content returns 409. The current installation serves one organisation. See OPERATIONS.md for setup and deployment.

Request size limits, per-adapter rate limits, credential rotation, role checks, monitoring consent status and audit records are implemented. Resolve delayed readings against the assignment effective at measurement time. Invalid/future timestamps and unsupported quality states require explicit policy before live acceptance. No secrets or real patient data belong in browser storage.

Implement vendor adapters only with verified documentation and test devices or provider sandbox access. The contract and backend do not supply vendor adapters or clinical alerting. Live device delivery still depends on the external connector.
