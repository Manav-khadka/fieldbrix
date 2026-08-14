# Sprint 10 — Task Lifecycle and Assignment

**Goal:** Let supervisors create, assign, control, and audit individual tasks.

**Prerequisite:** Sprint 9 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan transition, assignment, cancellation, and scope tests | QA | 3 | Sprint 9 sign-off |
| Implement task state machine, creation, assignments, flags, and history | Backend | 13 | Sprint 9 sign-off |
| Build task list/detail/create, assignment, schedule, and capacity views | Web | 13 | Task APIs |
| Implement attachments, worker action requests, reassignment, cancellation/reopen, lead/assistant responsibility, and idempotency | Backend/Web | 8 | Task foundation |
| Test every allowed and forbidden transition | QA | 5 | Implementations complete |
| Integration-test records, workflows, roles, teams, audit, and god mode | QA | 5 | Implementations complete |
| Regression-test workflow pinning and histories | QA | 3 | Functional tests complete |
| Test concurrent dispatch, immutability, and scope enforcement | Security/QA | 3 | Task feature complete |
| Correct lifecycle defects and re-test | Dev+QA | 8 | Test findings |
| Task-lifecycle QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Use approved TanStack tables, date utilities, dnd-kit and resizable panels behind owned task/dispatch adapters; keyboard assignment is equivalent to drag/drop.
- Correlate React assignment/navigation with API state transitions while scrubbing task/customer/site identifiers and attachments.

## Acceptance criteria

### Functional

- Supervisors create, assign, reassign, and cancel permitted tasks through the documented state machine.
- A task stores customer/site/optional target, pinned workflow, complaint/work type/description/instructions, schedule/due/estimated duration, priority, worker or team/responsible lead, signature policy and reference photo/document attachments.
- Workers can report unable to attend or request reassignment with a reason but cannot choose the new assignee; reassignment notifies old/new assignees and retains in-progress work.
- Draft deletion, post-approval cancellation/reopen and assistant evidence/final-submit behavior follow explicit permissions and immutable history; overdue, escalated, unavailable, safety and sync conditions remain flags rather than replacement statuses.
- Invalid transitions and post-approval field edits are rejected.
- Super Admin can directly control any task through an active, audited god-mode session.

### Test coverage required for sign-off

- Full state/flag matrix, attachments, unable/reassignment requests, concurrent edits, reassignment/cancellation/reopen, responsible lead/assistant behavior, old/new notifications, data scopes, idempotency, god-mode bypass, pinned versions and immutable history pass.
