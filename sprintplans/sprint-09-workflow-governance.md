# Sprint 9 — Workflow Governance and Templates

**Goal:** Publish safe workflow versions without changing active or historical tasks.

**Prerequisite:** Sprint 8 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan publish, version, archive, and pinning tests | QA | 3 | Sprint 8 sign-off |
| Implement draft/publish/version/archive/duplicate and immutable snapshots | Backend | 13 | Sprint 8 sign-off |
| Build version history, changes, publish controls, and catalogue UI | Web | 13 | Governance APIs |
| Implement platform templates, tenant duplication, audit, and reporting settings | Backend/Web | 8 | Governance foundation |
| Test lifecycle transitions and template duplication | QA | 5 | Implementations complete |
| Integration-test version pinning with tasks, permissions, and god mode | QA | 5 | Implementations complete |
| Regression-test copied/published rule behavior | QA | 3 | Functional tests complete |
| Test concurrent publishing, archives, and unauthorized changes | Security/QA | 3 | Governance complete |
| Correct governance defects and re-test | Dev+QA | 8 | Test findings |
| Workflow-governance QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Keep published-version UI on the approved builder/table stack and pin dependency versions in the release manifest so an upgrade cannot alter historical rendering silently.
- Trace publish/diff/render operations and page on immutability/hash failure; stale conflicts remain expected metrics.

## Acceptance criteria

### Functional

- New tasks select the current published version while active and historical work retains its original immutable definition.
- Platform templates can be published centrally and duplicated into a tenant without creating a code fork.

### Test coverage required for sign-off

- Concurrent edits, publish/archive transitions, template duplication, authorization, god-mode administration, audit history, and historical immutability pass.
