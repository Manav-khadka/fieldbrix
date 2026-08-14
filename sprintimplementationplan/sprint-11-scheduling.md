# Sprint 11 — Bulk Work, Recurrence, Scheduling, and Notifications

Source: [Sprint plan](../sprintplans/sprint-11-scheduling.md) · Prerequisite: Sprint 10 QA sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and data model

Supervisors import tasks, define recurring schedules and alter individual occurrences without duplicates. Users receive reliable in-product task notifications and overdue state changes. Add bulk jobs/rows, recurrence definitions, generated occurrences, exceptions, scheduler checkpoints/leases, notification inbox/read state and delivery attempts.

## API and job contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| POST | `/task-imports/preview` | `tasks.bulk.create` | uploaded file/mapping → row validation |
| POST | `/task-imports/:id/commit` | `tasks.bulk.create` | preview revision/idempotency → async job |
| GET | `/task-imports/:id` | `tasks.bulk.view` | progress/row results |
| GET/POST | `/recurrences` | `scheduling.recurrences.view/create` | RRULE-like validated local schedule |
| PATCH | `/recurrences/:id` | `scheduling.recurrences.edit` | future policy/revision/idempotency |
| POST | `/recurrences/:id/exceptions` | `scheduling.recurrences.edit` | skip/reschedule occurrence |
| GET | `/notifications` | Authenticated | scoped inbox/pagination/unread count |
| POST | `/notifications/:id/read` | Authenticated | idempotent read |
| POST | `/notifications/:id/dismiss` | Authenticated | idempotent dismiss; preserve inbox history |
| POST | `/notifications/read-all` | Authenticated | cutoff/idempotency |

Scheduler job input includes `scheduleId`, window start/end, timezone database version, lease token and correlation ID. Unique `(recurrenceId, occurrenceKey)` makes generation once-only.

## Implementation checklist

- [ ] Reuse safe import pipeline with task-specific lookup/version/assignment validation and row-level outcome codes.
- [ ] Define timezone/DST/month-end semantics, start/end limits, exception precedence and behavior when recurrence changes.
- [ ] Recurrence contract includes visit window, customer/site/optional target/workflow, default worker/team/lead, priority/instructions, look-ahead days and pause/resume/end while retaining generated/completed history.
- [ ] Implement scheduler lease/checkpoint, look-ahead window, unique occurrence key, retry and catch-up after downtime.
- [ ] Never mutate already-started historical occurrences; future-only edit policy is explicit.
- [ ] Implement overdue calculation as idempotent state/event processing with safe clock source and tenant timezone display.
- [ ] Consume task events into an in-product inbox; deduplicate notification type/entity/recipient/version.
- [ ] Implement the required catalogue: worker assignment/reassignment/upcoming/overdue/comment/rejection/sync failure; supervisor unable/overdue/safety/GPS/mismatch/failed test/refusal/submitted/prolonged sync; admin import failure/locked user/workflow publish.
- [ ] Add upcoming/due-today/missed recurrence queries and views with explicit freshness and timezone.
- [ ] Build bulk preview/results, recurrence calendar/editor/exceptions and notification inbox/read controls.
- [ ] Keep external email/SMS/WhatsApp delivery out except the existing auth adapter; tenant SMTP arrives Sprint 16.

## Dependency and Sentry implementation

- Implement the scheduler adapter with stable MIT `react-big-calendar`, date-fns/date-fns-tz and approved drag primitives. Add contract tests so it is replaceable; forbid FullCalendar/Schedule-X premium resource packages and license keys.
- Test resource/week views, keyboard reschedule/reassign, timezone/DST, optimistic rollback and accessibility. Trace scheduler/import/notification failures without task, person or customer values.

## Code-principle gate

- [ ] SRP: import, recurrence calculation, scheduler lease/generation, overdue evaluation and notification projection remain separate.
- [ ] OCP: schedule/notification event handlers extend registries and policies without modifying task lifecycle core.
- [ ] LSP/ISP/DIP: scheduler clock/lease and notification adapters pass focused contracts; scheduling domain owns interfaces.
- [ ] DRY/KISS/YAGNI: one timezone/occurrence-key policy is authoritative; external SMS/WhatsApp delivery is not scaffolded.
- [ ] Fail Fast: recurrence/version/scope/window/lease checks precede task generation and notification side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `task_import_*`, `recurrence_created/changed/generated/skipped`, `scheduler_lease_*`, `task_overdue`, `notification_created/read`; counts/windows/timezone |
| Audit | recurrence definitions/diffs/exceptions, imported task IDs and bulk rules; read state may be operational history rather than compliance audit per policy |
| Sentry | scheduler/import/notification spans across queue; group systemic generation failure; invalid rows and expected schedule errors are not issues |
| Metrics/alerts | generation lag/duplicates, scheduler duration/lease contention, import rows, overdue backlog, notification queue age/unread; page on missed window/DLQ |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test recurrence dates across DST, leap/month end, timezone changes, exceptions, future edits and unique occurrence keys.
- [ ] Run scheduler window/retry 10x and concurrently; prove one task per occurrence and catch-up without gaps.
- [ ] Endpoint tests cover invalid expression, stale revision, forbidden scope, archived workflow/records and cross-tenant access.
- [ ] E2E bulk import and recurrence → scheduler → task → notification → read; verify audit/outbox/correlation.
- [ ] Catalogue contract tests assert exact event → recipient → title/deep-link, dedupe, permission filtering, read/dismiss and revoked-assignment behavior.
- [ ] Test high-volume import/schedules, stuck lease, clock skew, queue delay, notification replay and revoked assignment.
- [ ] LambdaTest web: recurrence/calendar/bulk/inbox across browser matrix, timezone display, responsive/keyboard/WCAG checks.
- [ ] LambdaTest mobile: generated models and notification unread state compile; full app delivery deferred to Sprint 12 and assessment recorded.
- [ ] Load target recurrence volume and capture generation time, DB locks, queue age and query plans.

## Delivery and sign-off

- [ ] Publish recurrence/timezone policy, scheduler job/event schemas, notification catalogue, import codes and missed-window runbook.
- [ ] CI gates date property tests, scheduler concurrency/replay, RLS/scope, import security, web E2E/accessibility and OpenAPI drift.
- [ ] Production test-tenant smoke generates known occurrences and inbox events, then exercises alert/recovery.
- [ ] Attach generation reconciliation, Sentry trace, alarms, LambdaTest and QA sign-off; Sprint 12 is blocked until complete.
