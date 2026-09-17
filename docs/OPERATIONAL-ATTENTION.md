# CareGrid operational attention

Operational attention is CareGrid's non-clinical queue for workflow and device-data-flow exceptions. It is intentionally separate from clinical measurement alerting.

## Current attention types

- **Device awaiting first reading** — an enabled device is assigned to an actively monitored person but no measurement has been stored for that device yet.
- **Device outside freshness window** — the latest stored measurement is older than an explicitly configured operational freshness window.
- **Care-plan review due** — a non-paused care plan has reached its recorded review date.
- **Follow-up without owner** — an open care-team task does not yet have an assigned owner.

The queue is derived from persisted workspace state and is returned in the authenticated workspace snapshot as `attention`.

## Device freshness policy

CareGrid does not invent a freshness threshold. If `CAREGRID_DEVICE_FRESHNESS_HOURS` is omitted, devices with existing readings are not labelled stale.

To enable a technical freshness check, configure a positive number of hours in the server environment, for example:

```env
CAREGRID_DEVICE_FRESHNESS_HOURS=24
```

This setting describes expected data-flow recency only. It is not a clinical threshold and does not indicate whether a person's health status is safe or unsafe.

The authenticated workspace snapshot exposes the configured policy as:

```json
{
  "operationalPolicy": {
    "deviceFreshnessHours": 24
  }
}
```

When no policy is configured, `deviceFreshnessHours` is `null`.

## Workspace routes

- `/attention/` shows the current operational queue.
- `/people/` provides a searchable live people directory.
- `/people/<id>/` provides one person's connected-care workflow context, including stored automatic readings, devices, care plans and follow-ups.

Signed-in pages expose quick links to the people directory and operational attention queue. The attention shortcut also shows the current number of operational items.

## Safety boundary

Operational attention does not classify blood-pressure, glucose, SpO2 or pulse values. It does not diagnose a condition, calculate medical risk, recommend treatment, notify a patient or trigger emergency response.

Clinical measurement alerting is a separate future capability that requires explicit clinical governance, validated rules, verified device data and an approved response workflow.
