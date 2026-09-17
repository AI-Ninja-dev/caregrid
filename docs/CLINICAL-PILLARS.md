# CareGrid clinical pillars

CareGrid is organised around four product-level clinical pathways:

1. **Diabetes management** — connected glucose monitoring, review workflows, device continuity and longitudinal support.
2. **Hypertension management** — home blood-pressure monitoring, measurement context, follow-up tasks and care-plan review.
3. **Cardiovascular health** — a multi-metric pathway for heart-health monitoring, device data and coordinated care-team follow-up.
4. **Stroke prevention** — prevention-focused visibility across relevant risk-factor monitoring, follow-up and care-plan workflows.

These are product and workflow categories. They do not diagnose disease, calculate emergency risk, prescribe treatment or replace clinician judgement.

## Product contract

Every person enrolled in the production workspace should have one primary clinical pillar and a programme label. Care plans should retain a pillar so that dashboard summaries, queues and reports can be grouped consistently. Device readings remain measurement-specific and must not be interpreted solely from pillar membership.

The same pillar metadata should drive:

- dashboard population summaries;
- people and care-plan filters;
- patient profile context;
- care-plan ownership and review queues;
- alert and task context;
- reporting and exports;
- future device-integration prioritisation.

## Current implementation

The fictional demo represents all four pathways and keeps clinical wording non-diagnostic. The standalone care-plan model also carries pillar metadata and exposes empty pathways rather than hiding them.

The persisted workspace currently requires a schema migration so `people` and `care_plans` store pillar metadata directly. Until that migration is complete, pillar-aware demo functionality must not be presented as proof that production records are pillar-aware.

## Persisted workspace migration target

Add validated `pillar` and `programme` metadata to enrolled people, and validated `pillar` metadata to care plans. Existing records should migrate safely without losing readings, device assignments, tasks, reviews or audit history. The allowed pillar values must remain exactly:

- `Diabetes management`
- `Hypertension management`
- `Cardiovascular health`
- `Stroke prevention`

APIs should reject any other value. Existing care-plan versioning rules should continue to apply when pillar metadata changes.

## Safety boundary

Pillar membership provides workflow context only. Alerts must continue to be based on explicitly configured, clinician-agreed rules and verified device data. CareGrid must not infer diagnosis, treatment changes, emergency status or stroke/cardiovascular risk from a pillar label alone.
