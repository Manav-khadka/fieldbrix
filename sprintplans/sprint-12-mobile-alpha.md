# Sprint 12 — Mobile Foundation and Offline Walking Skeleton

**Goal:** Demonstrate a minimal mobile task flow with temporary connectivity loss.

**Prerequisite:** Sprint 11 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan mobile navigation, storage, and alpha tests | QA/Mobile | 3 | Sprint 11 sign-off |
| Implement Flutter architecture, generated models, password access, and routing | Mobile | 13 | Sprint 11 sign-off |
| Build home, duty state, tasks, search, acceptance, and offline availability | Mobile | 13 | Mobile foundation |
| Implement encrypted local database, basic synchronization, and sync states | Mobile/Backend | 8 | Task APIs |
| Test navigation, authentication, and minimal completion | QA | 5 | Implementations complete |
| Integration-test backend–sync–database–mobile skeleton | QA | 5 | Implementations complete |
| Regression-test assignments, roles, and generated models | QA | 3 | Functional tests complete |
| Test low-end Android, secure storage, restart, and offline launch | QA/Security | 3 | Mobile foundation |
| Correct mobile defects and re-test | Mobile+QA | 8 | Test findings |
| Internal-alpha QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity  
**Milestone:** Internal alpha

## Dependency and Sentry gate

- React catalog additions are `N/A`; resolve Flutter packages as a compatible stable, non-discontinued set and commit `pubspec.lock` with analyze/widget/device evidence.
- Initialize `sentry_flutter` for `fieldbrixxx/flutter` before the app, with release/dist/environment, bounded offline caching, navigation/network spans and no screenshots or payload capture.

## Acceptance criteria

### Functional

- A configured worker logs in, downloads an assigned minimal task, loses connectivity, records work, reconnects, and sees it reach the server.
- Start/End Duty records time and event-based location when policy requires it; no continuous background tracking is introduced.
- Home/My Tasks shows today, upcoming, urgent, overdue, completed and sync-pending views, task/customer/site/target search, offline availability, recent service summary and worker completed/returned history.
- The app clearly distinguishes available offline, saved offline, waiting, syncing, failed, and synced states.

### Test coverage required for sign-off

- Android emulator, selected low-end device and iPhone qualification cover duty, filters/search/history, app restart, token expiry, task reassignment, offline entry, secure storage, RBAC, large text/accessibility and generated-model compatibility.
