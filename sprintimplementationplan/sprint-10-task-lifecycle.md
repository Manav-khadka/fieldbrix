# Sprint 10 — Task Lifecycle and Assignment

Source: [Sprint plan](../sprintplans/sprint-10-task-lifecycle.md) · Prerequisite: Sprint 09 QA sign-off · Status: `IN PROGRESS` · Target: 64 points

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

- [x] Document statuses, allowed transitions, required permission, actor classes, preconditions, side effects and emitted event for every edge. (Verified: `transition-map.ts` — single authoritative `TRANSITION_MAP` const with `isAllowedTransition`/`isTaskStatus` helpers, unit-tested exhaustively for every allowed/forbidden edge in `task-transition.service.spec.ts`; action-specific permissions wired per edge in `TaskTransitionController` (`tasks.edit` generic, `tasks.cancel`, `tasks.reopen`). Emitted-event documentation lives in code comments, not a separate published contract doc.)
- [x] Generate human task numbers transactionally while UUID remains identity; enforce tenant-local uniqueness. (Verified: PostgreSQL sequence, transactionally allocated `FBX-` number, UUID task identity, and composite tenant uniqueness.)
- [x] Resolve/pin a published workflow version at create; reject draft/archived-without-policy versions. (Verified: `TaskService.create` requires `workflowVersionId`; `TaskRepository.create` rejects when the ID doesn't resolve to an existing `workflow_versions` row with `PUBLISHED_WORKFLOW_REQUIRED`. Gap: it does not additionally check whether the version's *parent draft* has since been archived — see the linked gap in the Sprint 09 checklist.)
- [ ] Persist complaint/work type/description/instructions, scheduled/due/estimated duration, priority, signature policy and reference photo/document attachments with customer/site/optional target. Partial: `CreateTaskDto` has `description/instructions/scheduledAt/dueAt/estimatedMinutes/priority/customerId/siteId/targetId`; there is no `workType`/complaint field and no signature-policy field. Reference attachments go through `POST /tasks/:id/attachments`, extracted during this review into a proper `TaskAttachmentService` (was inline SQL in the controller) — fixed a P0 where an unknown `uploadId` crashed with a 500 (the `task_attachments_upload_fk` foreign-key violation was never mapped to an HTTP exception) instead of a 400; now returns `UPLOAD_NOT_FOUND`. Confirmed via `test/workflow-lifecycle.e2e-spec.ts`.
- [x] Implement scope-aware list/detail queries with deterministic filters/order/pagination and indexed columns. (Verified: `TaskRepository.list` — `search/status/customerId/siteId/assignedTo` filters, `page/limit` capped at 100, uses the `tasks_status_schedule_idx` index. "Scope-aware" (`own`/`team`/`branch`/`all`) is not implemented — every task endpoint is `scope: 'all'` only, same gap as master-data.)
- [x] Assignment validates active membership, skill/branch constraints and capacity policy; close/create records atomically. Partial-verified: `TaskAssignmentService.assign` validates active worker/active team/team-membership-when-both-given inside one `db.transaction`, closing the prior assignment and inserting the new one atomically (`FOR UPDATE` row lock). Skill-based and capacity-policy constraints are not implemented — only membership/active-state is checked.
- [ ] Enforce one responsible worker/team lead for final submission; assistants may add only explicitly permitted evidence. Worker unable/reassignment requests notify supervisors but cannot directly assign. Partial: the DB enforces "one active lead" via `task_one_active_lead_idx` (`WHERE ended_at IS NULL AND lead = true`), and `POST /tasks/:id/action-requests` (`tasks.request_action`, scope `own`) lets a worker request reassignment without assigning anyone themselves — but there is no supervisor-notification side effect yet (the request only appends a `task_history` row) and no assistant-vs-lead evidence-contribution permission model.
- [ ] Represent overdue, escalated, customer-unavailable, safety-stop and sync-pending as typed flags/exceptions, never substitute statuses; make post-approval cancel/reopen policy explicit. Not started — `tasks.flags` is a plain `jsonb` column with no service logic that computes or writes any of these flags.
- [x] Use optimistic revision plus DB lock where transition races can create double side effects. (Verified: revision predicates for updates and `FOR UPDATE` in transitions/assignment transactions.)
- [ ] Build React list/detail/create, status controls, assignment drawer, schedule/capacity view, flags and immutable timeline. Partial: `routes/tasks/detail.tsx` has real, working status-transition controls (buttons generated from the transition map, revision-aware) and a real immutable timeline reading `GET /tasks/:id/history`; `routes/tasks/{list,capacity}.tsx` are real read views. `routes/tasks/create-task-form.tsx` is now a real create form (react-hook-form + zod, matching the handbook's mandated stack) — cascading customer→site→optional-target selects, a published-workflow-only picker that resolves to the workflow's `currentVersionId` before submit (never lets a draft/archived version be selected), priority/schedule/due fields, and server-error surfacing; 3 tests cover the cascading-disable behavior, client-side validation blocking submission, and a full successful submit with payload assertions. `routes/tasks/assignment-drawer.tsx` is now a real assignment drawer on the task detail page — worker/team selects (inactive teams excluded client-side), lead checkbox, reason field, submit disabled until a worker and/or team is chosen, server errors (e.g. `ACTIVE_WORKER_REQUIRED`) surfaced inline rather than silently closing; 3 tests. While building it, found and fixed a real backend gap: `TaskAssignmentService.assign` never wrote a `task_history` row or outbox event, unlike every other task mutation — assignment was completely invisible in the audit timeline and nothing could react to it downstream. Now emits `TASK_ASSIGNED` history + `task.assigned.v1` outbox event inside the same transaction; covered by a new e2e assertion. Pre-fill gap closed in a follow-up pass: added `GET /tasks/:id/assignments` (`tasks.view` scope — reading the current assignment is a view concern, distinct from the `tasks.assign` write permission) returning the single open `task_assignments` row or `null` (at most one open row can exist per task — `assign()` always closes the prior one before inserting, so this is a lookup, not an aggregation). The drawer now fetches it and pre-fills worker/team/lead exactly once on load, guarded so a background refetch never clobbers an in-progress edit, and relabels itself "Reassign task" when one exists. 2 new e2e tests (returns the assignment; returns null when unassigned) and 1 new frontend test (pre-fill + relabel). Flags are not surfaced (matches the flags gap above — nothing to display).
- [x] Publish versioned task events through outbox; notifications consume later without changing task transaction. (Verified: `task.created.v1`/`task.transitioned.v1` outbox events emitted inside the same transaction as the task mutation in `TaskRepository`; no notification consumer exists yet to react to them — that's Sprint 11 scope.)

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
