# CareGrid

A care-team demonstration app for HomeClinicStore, built with Next.js, React and TypeScript.

## Run

Use Node.js 22.6 or newer. Run `npm ci` and `npm run dev -- --port 3001`. Open http://localhost:3001. For verification, run `npm run lint`, `npm test`, `npm run typecheck` and `npm run build`. Static production output is generated in `out/`.

## First release

- Responsive navigation and overview with derived review counts.
- Searchable fictional people, programme filtering and empty-state recovery.
- Person views with sample reading charts and accessible data tables.
- Sample alert queue with acknowledgement, reopening and filtering.
- Device availability, battery and latest-sample views.
- Workspace information and resettable demo state.

All names, devices, readings and tasks are fictional. The displayed date is a fixed sample day and times use SAST. Alert acknowledgement affects only page memory and resets on refresh; it does not contact a patient, change a clinical plan or resolve an incident. No clinical thresholds are implemented. Blood-pressure trends show systolic sample values only, not complete measurements.

## Before real patient use

This app has no authentication, backend, device connection, patient messaging, clinical decision engine or emergency response service. Do not enter real health information. A production programme needs agreed requirements for identity, role permissions, consent, privacy, storage, audit trails, device provenance, clinical response rules and operational support. These are future work, not implemented capabilities.

## Structure

- `app/page.tsx`: workspace views and client interaction.
- `app/globals.css`: responsive visual system, keyboard focus and reduced-motion handling.
- `lib/demo.ts`: typed fictional records and pure filtering/acknowledgement logic.
- `tests/demo.test.ts`: search, workflow transition and sample-record integrity tests.

## Verification and known limits

Production export, TypeScript, lint and three workflow/data tests pass. Full browser interaction and assistive-technology testing remain to be completed. Dependency audit reports two transitive findings through Next.js's bundled PostCSS; the automatic fix requires a major Next.js upgrade. Review this before server deployment. This release exports static files and has no server data processing.

The repository remains private. Committing this app does not publish it or change repository visibility.

## Care-task workflow

The Tasks view adds sample role assignment, To do / In progress / Completed status changes, status filtering and session activity history. Tasks must have an assigned role before progressing; active or completed tasks cannot be left unassigned. Reopen a task to To do before removing its owner. Navigating between views preserves activity; refreshing or using Reset demo activity clears it. No notifications are sent and completion has no clinical effect. `lib/workflow.ts` contains the immutable transition logic, covered by two additional tests (five total).

## Direct links and patient review queues

Workspace views now have hash links, including `/#/people/CG-003` and `/#/alerts?person=CG-003`. Refresh retains the selected view; browser Back and Forward restore navigation without discarding in-memory workflow changes. Reload still resets demo activity. Invalid routes safely fall back to the overview or list. URLs contain fictional IDs only.

Person details can open a review queue scoped to that person, with an explicit option to show all people. Mobile navigation displays all seven destinations without sideways scrolling. Eight logic tests and three browser suites cover these behaviours alongside the existing workflows.
