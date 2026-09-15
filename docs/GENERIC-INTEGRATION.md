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

The current site is a static export, with no receiving endpoint. A backend must authenticate each integration, load its organisation and active device assignments server-side, then call the acceptance gate. Never accept that context from the incoming payload. Store the reading and event key atomically under a unique constraint; acknowledge retries without duplicating readings. A repeated event ID with different content must be flagged, not silently overwritten.

The backend must also enforce request size and rate limits, credential rotation, consent and access controls, timestamp/freshness rules, device reassignment history and audit records. Resolve delayed readings against the assignment effective at measurement time. Invalid/future timestamps and unsupported quality states require explicit policy before live acceptance. No secrets or real patient data belong in browser storage.

Implement vendor adapters only with verified documentation and test devices or provider sandbox access. No vendor integration, live ingestion, clinical alerting or storage is claimed by this contract.
