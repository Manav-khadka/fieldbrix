# Sprint 14 — Offline Sync and Conflict Hardening

**Goal:** Guarantee work survives connectivity loss, retries, restarts, and concurrent changes.

**Prerequisite:** Sprint 13 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Define offline chaos and conflict matrix | QA/Mobile | 3 | Sprint 13 sign-off |
| Implement ordered mutations, deduplication, replay, and conflict policy | Mobile/Backend | 13 | Sprint 13 sign-off |
| Implement resumable media upload, atomic completion, and restart recovery | Mobile/Backend | 13 | Evidence capture |
| Implement reconciliation, server time, and false-completion prevention | Backend/Mobile | 8 | Sync foundation |
| Test full-day offline, flaky networks, media failure, and retry | QA | 5 | Implementations complete |
| Test reassignment/cancellation conflicts with offline work | QA | 5 | Implementations complete |
| Regression-test states, evidence, versions, and notifications | QA | 3 | Functional tests complete |
| Test replay, clock skew, storage-full, packet loss, and corruption | QA/Security | 3 | Sync complete |
| Correct sync defects and repeat chaos suite | Dev+QA | 8 | Test findings |
| Offline-sync QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- React catalog additions are `N/A`; upgrades to database, connectivity, HTTP or sync packages must pass replay, migration, corruption, battery and full-day offline tests.
- Trace device→API→storage sync with bounded encrypted offline events and consented scrubbed diagnostics; never attach queued mutation payloads.

## Acceptance criteria

### Functional

- No task is shown as synced until every required mutation and evidence object is accepted.
- Retries do not duplicate runs, answers, evidence, confirmation, or reports.
- Device storage preserves answers, GPS, images, signature metadata and submission across app/phone restart; poor connections send compressed previews/smallest acceptable evidence first without degrading required originals.
- Defined cancellation and reassignment conflicts produce reviewable, deterministic outcomes.

### Test coverage required for sign-off

- Full-day offline, app termination, 10× replay, clock skew, partial uploads, packet loss, concurrent reassignment/cancellation, corrupted payload, and storage exhaustion pass.
