# Sprint 11 — Bulk Work, Recurrence, Scheduling, and Notifications

**Goal:** Support repeatable planning and timely in-product communication.

**Prerequisite:** Sprint 10 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan bulk, recurrence, overdue, and notification tests | QA | 3 | Sprint 10 sign-off |
| Implement bulk-task upload | Backend/Web | 13 | Sprint 10 sign-off |
| Implement recurrence generation, exceptions, and occurrence rescheduling | Backend/Web | 13 | Task lifecycle |
| Implement task-event notifications, overdue jobs, and inbox | Backend/Web | 8 | Task events |
| Test bulk results, recurrence, rescheduling, and notifications | QA | 5 | Implementations complete |
| Integration-test scheduler–task–notification–permission behavior | QA | 5 | Implementations complete |
| Regression-test imports, tasks, audit, and workflow versions | QA | 3 | Functional tests complete |
| Test timezones, duplicate generation, retries, and high volume | QA | 3 | Scheduling complete |
| Correct scheduling defects and re-test | Dev+QA | 8 | Test findings |
| Scheduling QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Use stable MIT `react-big-calendar` behind a FieldBrix scheduler adapter with date-fns/date-fns-tz and dnd-kit; all FullCalendar/Schedule-X premium resource packages and license keys are prohibited.
- Test resource views, keyboard rescheduling, DST/timezones and rollback; Sentry traces scheduler/import/notification failures without task/customer data.

## Acceptance criteria

### Functional

- Supervisors import tasks and manage daily, weekly, monthly, weekday, and custom recurrence without duplicate generation.
- Recurrences include start/end, visit window, look-ahead generation days, customer/site/optional target/workflow, default assignment/lead, priority/instructions and pause/resume/end without deleting history.
- A single generated occurrence can be rescheduled without changing its series; upcoming, due-today and missed visits are visible.
- The in-app catalogue includes worker assignment/reassignment/upcoming/overdue/comment/rejection/sync-failure; supervisor unable/overdue/safety/GPS/mismatch/failed-test/refusal/submission/prolonged-sync; and admin import-failure/locked-user/workflow-publish events. External delivery never gates execution.
- Super Admin can inspect and correct any tenant schedule.

### Test coverage required for sign-off

- Timezones/DST, month ends, look-ahead windows, pause/resume/end, missed runs, replay, one-occurrence changes, bulk-row failures, high-volume generation, exact recipient/event routing, dedupe/read/dismiss states, permissions and god mode pass.
