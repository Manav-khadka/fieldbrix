# Sprint 18 — MVP Security and Paid-Pilot Release

**Goal:** Qualify the MVP for controlled paid pilots under realistic production conditions.

**Prerequisite:** Sprint 17 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Finalize pilot, rollback, and evidence checklist | QA/Platform | 3 | Sprint 17 sign-off |
| Run four-sector production-like rehearsals | QA/Product | 13 | Sprint 17 sign-off |
| Complete tenant, RBAC, god-mode, upload, audit, and secret security campaign | Security/Backend | 13 | Complete MVP |
| Complete offline stress, backup, rollback, and synthetic checks | QA/DevOps/Mobile | 8 | Complete MVP |
| Validate every MVP journey end to end | QA | 5 | Rehearsals complete |
| Validate production test tenants, monitoring, alerts, and runbooks | QA/DevOps | 5 | Production deployment |
| Re-run all automated suites | QA | 3 | Functional tests complete |
| Run accessibility, browser/device, performance, and retention checks | QA/Security | 3 | Release candidate |
| Correct release defects and repeat qualification | Dev+QA | 8 | Test findings |
| Paid-pilot release sign-off | QA/Product | 3 | Launch blockers closed |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity  
**Milestone:** Paid-pilot MVP

## Dependency and Sentry gate

- Freeze exact web/backend/mobile/Lambda dependency manifests and lockfiles in the RC; reject deprecated/vulnerable or paid/premium frontend runtime packages and document the grid-beta exception.
- Verify all four Sentry projects, releases, source maps/symbols, alerts, runbooks, scrubbing and crash/error baselines with no unresolved release-blocking issue.

## Acceptance criteria

### Functional

- Every critical MVP journey succeeds with realistic data and field devices.
- The complete DOCX web/mobile/platform screen inventory is reachable and permission-correct; all explicitly deferred capabilities remain absent from active navigation and public contracts.
- Pilot scorecards record configuration time, worker completion without help, completion/abandonment, offline sync, on-time/overdue, review/rejection, follow-up reasons, confirmation rate and configuration-versus-custom-code ratio.
- Operations can deploy, monitor, restore, and roll back the production system.
- God mode resolves tenant incidents without weakening isolation for any other identity.

### Test coverage required for sign-off

- No unresolved P0/P1 defects.
- No tenant leakage, unauthorized god access, self-approved destructive action, evidence loss, duplicate completion, workflow-history mutation, safety bypass, or false sync state.
- No OTP/PIN/phone-login, customer portal, invoice/payment, live/off-duty tracking, route optimization, custom master module, AI/OCR or native white-label feature leaks into the paid-pilot MVP.
- Four-sector rehearsal evidence and operational sign-off are attached to the release record.
