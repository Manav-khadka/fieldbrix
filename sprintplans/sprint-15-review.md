# Sprint 15 — Customer Signature and Supervisor Review

**Goal:** Complete the governed lifecycle from submission through customer acknowledgment and approval.

**Prerequisite:** Sprint 14 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan confirmation, review, correction, and follow-up tests | QA | 3 | Sprint 14 sign-off |
| Implement completion summary, signature, refusal/unavailable, declaration, and checkout | Mobile/Backend | 13 | Sprint 14 sign-off |
| Build review queues, evidence review, approval, rejection, and exception decisions | Backend/Web | 13 | Submitted tasks |
| Implement selective correction, history, and linked follow-ups | Backend/Web/Mobile | 8 | Review foundation |
| Test signatures and every review path | QA | 5 | Implementations complete |
| Integration-test submission–sync–review–approval | QA | 5 | Implementations complete |
| Regression-test states, evidence, roles, and notifications | QA | 3 | Functional tests complete |
| Test signature integrity, unauthorized approval, and audit completeness | Security/QA | 3 | Review complete |
| Correct completion/review defects and re-test | Dev+QA | 8 | Test findings |
| Review QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Own `signature_pad` only for the authorized web fallback and reuse approved table/PDF/evidence components; server summary/hash validation remains authoritative.
- Trace submit/review/correction integrity failures while expected rejection is a metric/breadcrumb and signature bytes/evidence never enter Sentry.

## Acceptance criteria

### Functional

- Customers review a completion summary and sign without an account; refusal or unavailability is explicitly recorded.
- The summary includes target/area, complaint, findings/work, parts, result and follow-up; signature captures signer name/designation, date/time and a hash of the exact summary, and the worker declaration covers accuracy, safe work area and customer notification.
- Supervisors approve, return selected fields for correction, or create a linked follow-up without rewriting original evidence.
- Supervisors explicitly accept/resolve/dismiss GPS, confirmation, target, validation, final-test and safety exceptions and approve/reject target-registration requests; physical revisit creates a linked task.
- Super Admin may review or decide any tenant submission through audited god mode.

### Test coverage required for sign-off

- Offline signature/summary hash, declaration/checkout, missing confirmation, refusal/unavailable, exception and target-registration decisions, rejection/resubmission cycles, physical revisits, scopes, god-mode review, immutable submitted runs/evidence and audit history pass.
