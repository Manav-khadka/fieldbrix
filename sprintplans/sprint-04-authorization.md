# Sprint 4 — Dynamic RBAC, God Mode, and Audit

**Goal:** Establish tenant-defined authorization while giving Platform Super Admin controlled, unrestricted god-mode access.

**Prerequisite:** Sprint 3 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Define tenant permission and god-mode security matrix | QA/Security | 3 | Sprint 3 sign-off |
| Implement roles, permissions, assignments, scopes, and capability evaluation | Backend | 13 | Sprint 3 sign-off |
| Build tenant role/preset administration and dashboard-feature selection | Web | 13 | Permission APIs |
| Implement god-mode tenant context, re-authentication, banner, audit, and dual approval | Backend/Web | 8 | Authentication foundation |
| Test blank roles, cloned roles, additive grants, and god-mode operations | QA | 5 | Implementations complete |
| Integration-test guards, scopes, dashboard capabilities, audit, and god-mode bypass | QA | 5 | Implementations complete |
| Regression-test authentication and RLS under tenant and god-mode contexts | QA | 3 | Functional tests complete |
| Attempt privilege escalation, forged god context, self-approval, and scope bypass | Security/QA | 3 | Authorization complete |
| Correct authorization defects and re-test all affected roles | Dev+QA | 8 | Test findings |
| Authorization QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Use approved TanStack Table/Virtual and owned Radix/shadcn components for role/capability matrices; authorization facts never live in Zustand or URL state.
- Trace tenant-RBAC and god-mode evaluation with low-cardinality tags; forged/self-approved privileged paths page while ordinary denials remain metrics/breadcrumbs.

## Acceptance criteria

### Functional

- Tenant admins create blank or preset-derived roles and assign dashboard/module/action/scope grants.
- Existing `membership_role` and `permission_overrides` data is migrated into roles/grants/assignments without losing the original Company Admin, Supervisor or Field Worker access intent; the old enum/override path is no longer authoritative.
- Multiple roles produce an additive union of grants; anything ungranted is denied.
- Platform Super Admin performs every tenant action regardless of tenant permissions.
- God-mode entry requires explicit tenant selection, reason, and recent password verification and displays a persistent banner.
- Irreversible operations require approval by a different authorized platform administrator.

### Test coverage required for sign-off

- Deny-by-default, additive grants, `own`/`team`/`branch`/`all` scopes, cache invalidation, platform-role isolation, and dashboard/API consistency pass.
- Forged/expired god sessions, missing reasons, tenant switching, self-approval, approval expiry, and audit completeness pass.
