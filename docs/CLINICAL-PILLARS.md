# CareGrid clinical pillars

CareGrid is organised around four product-level clinical pathways:

1. **Diabetes management** — connected glucose monitoring, review workflows, device continuity and longitudinal support.
2. **Hypertension management** — home blood-pressure monitoring, measurement context, follow-up tasks and care-plan review.
3. **Cardiovascular health** — a multi-metric pathway for heart-health monitoring, device data and coordinated care-team follow-up.
4. **Stroke prevention** — prevention-focused visibility across relevant risk-factor monitoring, follow-up and care-plan workflows.

These are product and workflow categories. They do not diagnose disease, calculate emergency risk, prescribe treatment or replace clinician judgement.

## Product contract

Every person enrolled in the production workspace has one primary clinical pillar and a programme label. Care plans retain a pillar so dashboard summaries, queues and reports can be grouped consistently. Device readings remain measurement-specific and are not interpreted solely from pillar membership.

The same pillar metadata drives or is available to drive:

- dashboard population summaries;
- people and care-plan filters;
- person profile context;
- care-plan ownership and review queues;
- operational attention and task context;
- reporting and exports;
- future device-integration prioritisation.

## Current implementation

The four-pillar model is now persisted in the live SQLite workspace as well as represented in the fictional demo. `people` records store validated `pillar` and `programme` values, while care plans store validated pillar metadata independently. Existing databases are upgraded automatically by an idempotent migration that preserves people, readings, devices, tasks, plans, reviews and audit history.

The live workspace exposes person-level connected-care summaries and a separate operational attention queue. Operational attention currently covers workflow and data-flow conditions such as devices awaiting a first stored reading, due care-plan reviews and unassigned follow-ups. Device freshness is only evaluated when an explicit operational freshness policy is supplied.

The allowed pillar values remain exactly:

- `Diabetes management`
- `Hypertension management`
- `Cardiovascular health`
- `Stroke prevention`

Programme mapping is validated server-side, and unsupported pillar/programme combinations are rejected. Administrators can correct a person's pathway assignment without recreating the person or rewriting historical device records. Care-plan versioning and ownership rules continue to apply.

## Safety boundary

Pillar membership provides workflow context only. The operational attention queue does not classify measurement values or infer a person's medical condition. Clinical measurement alerts, treatment recommendations, patient notifications and emergency-response rules are separate future capabilities that require explicit clinical governance, validated rules and verified device data.

CareGrid must not infer diagnosis, treatment changes, emergency status or stroke/cardiovascular risk from a pillar label alone.
