# Sprint 24 — Growth GA Qualification

**Goal:** Release the complete product with verified security, reliability, documentation, and monitoring.

**Prerequisite:** Sprint 23 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Finalize launch, rollback, migration, and operational checklist | QA/Platform | 3 | Sprint 23 sign-off |
| Run complete customer-to-field-to-invoice E2E campaigns | QA/Product | 13 | Sprint 23 sign-off |
| Complete portal, RBAC, god-mode, SMTP, privacy, and invoice security campaign | Security/Backend | 13 | Release candidate |
| Implement final synthetics, alerts, backups, guides, and runbooks | DevOps/Backend | 8 | Production candidate |
| Validate all acceptance journeys in isolated production tenants | QA | 5 | Candidate deployed |
| Validate deployment, rollback, recovery, SMTP failure, and escalation | QA/DevOps | 5 | Operations ready |
| Run complete backend, web, mobile, offline, portal, and invoice regression | QA | 3 | Functional tests complete |
| Run performance, accessibility, browser/device, retention, and cost checks | QA/Security | 3 | Release candidate |
| Correct release defects and repeat qualification | Dev+QA | 8 | Test findings |
| Growth GA sign-off | QA/Product | 3 | All gates pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity  
**Milestone:** Growth GA

## Dependency and Sentry gate

- Final manifests/lockfiles pass latest-compatible-stable review, SBOM, advisory/deprecation/discontinuation and approved open-source-license gates; only the documented exact grid beta exception remains and no premium UI dependency launches.
- Validate all Sentry releases, source maps/symbols, scrubbers, crash/error baselines, alerts and runbooks during canary/rollout and record dependency/Sentry evidence in the GA manifest.

## Acceptance criteria

### Functional

- The complete platform operates across tenant administration, god mode, dynamic roles, configurable work, offline execution, portal, contracts, invoices, tracking, and reporting.
- Deployment, recovery, support, and security procedures are documented and demonstrated.

### Test coverage required for sign-off

- No open release-blocking defects.
- Full backend, web, mobile, offline, template, portal, contract, invoice, SMTP, and tracking regression passes.
- Attempts to forge god mode, reuse expired god sessions, approve one's own destructive request, bypass audit controls, or cross tenant/customer boundaries fail.
- Performance, accessibility, browser/device, retention, backup/restore, deployment, rollback, monitoring, and cost checks pass.
