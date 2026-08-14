# Sprint 20 — Contracts, Entitlements, and Renewals

**Goal:** Make contract coverage visible and enforceable throughout operations.

**Prerequisite:** Sprint 19 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan contract, entitlement, renewal, and history tests | QA | 3 | Sprint 19 sign-off |
| Implement contracts, versions, coverage, allowances, and amendments | Backend | 13 | Sprint 19 sign-off |
| Implement entitlement evaluation in tasks, mobile, and portal | Backend/Web/Mobile | 13 | Contract model |
| Implement renewal dates, email reminders, lapsed flags, and histories | Backend/Web | 8 | SMTP and contracts |
| Test lifecycle, coverage, amendments, and renewals | QA | 5 | Implementations complete |
| Integration-test contracts across portal, tasks, mobile, reports, and email | QA | 5 | Implementations complete |
| Regression-test records, workflows, and recurring work | QA | 3 | Functional tests complete |
| Test overlaps, versions, timezones, scopes, and volume | Security/QA | 3 | Contracts complete |
| Correct contract defects and re-test | Dev+QA | 8 | Test findings |
| Contracts QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Reuse approved tables/forms/date-fns timezone utilities for effective-dated contracts; no duplicate date library enters the bundle.
- Trace entitlement/renewal transactions and systemic reminder failures with contract versions/outcome codes only, never customer or allowance details.

## Acceptance criteria

### Functional

- Staff and customers see correct historical and current coverage and service history.
- Field workers see included-versus-billable entitlements before starting work.
- Renewal and lapsed-service notifications use email only.
- Super Admin can override or correct any contract through audited god mode.

### Test coverage required for sign-off

- Amendments, overlapping coverage, active-task changes, history immutability, renewal dates, timezone boundaries, tenant/customer scopes, volume, and god-mode operations pass.
