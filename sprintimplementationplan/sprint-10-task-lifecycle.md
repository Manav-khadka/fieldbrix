# Sprint 10 — Task Lifecycle and Assignment

Source: [Sprint plan](../sprintplans/sprint-10-task-lifecycle.md) · Prerequisite: Sprint 09 QA sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and state model

Supervisors create, assign, schedule, flag, reassign and cancel individual tasks with immutable workflow-version pinning and complete history. Define one typed transition graph and reject all other transitions. Current assignment is temporal (`startedAt`, `endedAt`); lead responsibility and reassignment history are never overwritten.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| GET/POST | `/tasks` | `tasks.view/create` + scope | filters/pagination or idempotent task creation pinned to version |
| GET/PATCH | `/tasks/:id` | `tasks.view/edit` + scope | safe detail/revision update; immutable fields rejected |
| POST | `/tasks/:id/assignments` | `tasks.assign` + scope | worker/team/lead/reason/idempotency |
| POST | `/tasks/:id/reassign` | `tasks.assign` + scope | close old/create new atomically |
| POST | `/tasks/:id/transitions` | action-specific permission | target status/reason/revision/idempotency |
| POST | `/tasks/:id/cancel` | `tasks.cancel` + scope | reason/idempotency; transition rules |
| POST | `/tasks/:id/reopen` | `tasks.reopen` + scope | admin/god reason/revision/idempotency; append-only history |
| POST | `/tasks/:id/attachments` | `tasks.edit` + scope | reference upload ID/category/idempotency; pre-work evidence |
| POST | `/tasks/:id/action-requests` | `tasks.request_action` own/team | unable-to-attend or reassignment reason/idempotency; worker cannot pick replacement |
| GET | `/tasks/:id/history` | `tasks.history.view` + scope | timeline of audit/domain events |
| GET | `/scheduling/capacity` | `tasks.assign` + branch scope | window/team/user workload summary |

## Implementation checklist

- [ ] Document statuses, allowed transitions, required permission, actor classes, preconditions, side effects and emitted event for every edge.
- [ ] Generate human task numbers transactionally while UUID remains identity; enforce tenant-local uniqueness.
- [ ] Resolve/pin a published workflow version at create; reject draft/archived-without-policy versions.
- [ ] Persist complaint/work type/description/instructions, scheduled/due/estimated duration, priority, signature policy and reference photo/document attachments with customer/site/optional target.
- [ ] Implement scope-aware list/detail queries with deterministic filters/order/pagination and indexed columns.
- [ ] Assignment validates active membership, skill/branch constraints and capacity policy; close/create records atomically.
- [ ] Enforce one responsible worker/team lead for final submission; assistants may add only explicitly permitted evidence. Worker unable/reassignment requests notify supervisors but cannot directly assign.
- [ ] Represent overdue, escalated, customer-unavailable, safety-stop and sync-pending as typed flags/exceptions, never substitute statuses; make post-approval cancel/reopen policy explicit.
- [ ] Use optimistic revision plus DB lock where transition races can create double side effects.
- [ ] Build React list/detail/create, status controls, assignment drawer, schedule/capacity view, flags and immutable timeline.
- [ ] Publish versioned task events through outbox; notifications consume later without changing task transaction.

## Dependency and Sentry implementation

- Build task/dispatch surfaces with approved TanStack tables, date-fns, dnd-kit and resizable panels behind owned adapters; all drag actions have equivalent keyboard controls and rollback behavior.
- Correlate React assignment/navigation spans with Nest transition/outbox spans using safe outcome/state tags; scrub task, customer, site, attachment and assignee identifiers.

## Code-principle gate

- [ ] SRP: task aggregate, transition policy, assignment/capacity, number allocation, version resolution and event publishing remain separate.
- [ ] OCP: statuses/actions/side-effect handlers extend typed transition/event maps rather than scattered conditionals.
- [ ] LSP/ISP/DIP: event/outbox and capacity implementations satisfy focused ports; task domain imports no queue/Prisma SDK directly.
- [ ] DRY/KISS/YAGNI: one transition/permission matrix drives API/UI/tests; bulk/recurrence behavior stays in Sprint 11.
- [ ] Fail Fast: version, scope, worker, revision and transition preconditions pass before assignment/status/event side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `task_created/updated/assigned/reassigned/transitioned/cancelled`, `task_transition_rejected`, `task_concurrency_conflict`; safe IDs/status/duration |
| Audit | complete task/assignment/status before-after, reason, pinned workflow version, god session and revision |
| Sentry | transition/assignment/database/outbox spans; capture inconsistent state or event failure; expected invalid transitions are metrics |
| Metrics/alerts | task create/transition latency, counts by status, assignment conflicts, stale revisions, outbox lag; alert on stuck outbox or impossible state |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test every allowed and forbidden transition, assignment validation, scope filter, task number and version pinning.
- [ ] Endpoint tests cover happy path plus invalid status, stale revision, inactive worker, wrong scope, archived version and cross-tenant IDs.
- [ ] Concurrency-test double assignment/cancel/transition and repeated idempotency key; exactly one side effect/event/history entry.
- [ ] E2E master record + published workflow → task → assign → reassign → transition/cancel → history.
- [ ] E2E covers task attachments, worker unable/reassignment request, old/new assignee notification projection, retained in-progress evidence, assistant contribution, lead submit and controlled reopen.
- [ ] Verify god mode performs every action regardless of tenant roles while preserving reason/banner/audit.
- [ ] LambdaTest web: tables/filters/create/detail/assignment/status/history across browser matrix and tablet; drag/keyboard where applicable, WCAG scan.
- [ ] LambdaTest mobile: `N/A—task UI arrives Sprint 12`; validate generated task models compile on Android/iOS.
- [ ] Load 500 visible tasks/10k total, capacity queries and concurrent dispatch; enforce query/interaction budgets.

## Delivery and sign-off

- [ ] Publish transition matrix, task event schemas, assignment rules, permission inventory and dispatcher recovery runbook.
- [ ] CI gates transition truth table, RLS/scope matrix, concurrency/idempotency, OpenAPI/model drift, web E2E/accessibility.
- [ ] Production test-tenant smoke exercises full lifecycle and god correction; inspect outbox/log/audit/Sentry.
- [ ] Attach test matrix, query plans, LambdaTest/Sentry evidence and QA sign-off; Sprint 11 is blocked until complete.
