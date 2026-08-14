# Sprint 19 — Customer Portal and Self-Service Tickets

**Goal:** Give customer users secure access to raise and track service requests.

**Prerequisite:** Sprint 18 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan portal identity and isolation tests | QA/Security | 3 | Sprint 18 sign-off |
| Implement portal password identity, contacts, site access, and reset | Backend | 13 | MVP platform |
| Implement service requests, photos, status, comments, and task conversion | Backend/Web | 13 | Portal identity |
| Build responsive portal, branding hooks, and email events | Web/Backend | 8 | Portal APIs |
| Test access, requests, uploads, status, and recovery | QA | 5 | Implementations complete |
| Integration-test portal request–dispatcher task flow | QA | 5 | Implementations complete |
| Regression-test staff auth, tenant roles, and tasks | QA | 3 | Functional tests complete |
| Test customer isolation, uploads, responsiveness, and accessibility | Security/QA | 3 | Portal complete |
| Correct portal defects and re-test | Dev+QA | 8 | Test findings |
| Portal QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Reuse the approved Router/Query/forms/UI/upload stack for the separate portal bundle; do not introduce a second framework, premium widget or portal-only validation source.
- Use a separate portal frontend release in `fieldbrixxx/vite-react`; scrub URLs/referrers/form text and keep replay disabled pending masking approval.

## Acceptance criteria

### Functional

- Authorized customer users create photo-backed requests and follow resulting task status.
- Portal users see only their permitted customer/sites and never receive tenant-workforce permissions.
- Super Admin can support any portal account through audited god mode.

### Test coverage required for sign-off

- Customer/site isolation, password recovery, duplicate requests, invalid uploads, responsive mobile browsers, accessibility, dispatcher conversion, and god-mode audit pass.
