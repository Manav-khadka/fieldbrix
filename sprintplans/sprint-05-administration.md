# Sprint 5 — Platform and Company Administration

**Goal:** Let Super Admin control every tenant and let tenant admins configure their companies within granted permissions.

**Prerequisite:** Sprint 4 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan tenant lifecycle, god-mode, and onboarding tests | QA | 3 | Sprint 4 sign-off |
| Build tenant lifecycle, limits, usage, health, support, and god-mode tenant entry | Backend/Web | 13 | Sprint 4 sign-off |
| Build company branding, terminology, branches, policies, and working settings | Backend/Web | 13 | Sprint 4 sign-off |
| Build user/team membership, invitations, skills, and deactivation | Backend/Web | 8 | Dynamic RBAC |
| Test tenant creation, configuration, suspension, god-mode edits, and teams | QA | 5 | Implementations complete |
| Integration-test settings through RBAC, god mode, UI, email identity, and audit | QA | 5 | Implementations complete |
| Regression-test authentication, RBAC, and tenant context | QA | 3 | Functional tests complete |
| Test plan limits, destructive approvals, suspension, and historical attribution | Security/QA | 3 | Administration complete |
| Correct administration defects and re-test | Dev+QA | 8 | Test findings |
| Administration QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Add approved command-palette, phone-input, color/crop and product-guidance libraries only for capability-filtered administration; branding and phone input never expand authentication scope.
- Cover provisioning, invitations, branding and god-mode administration in scrubbed React/Nest traces without names, emails, phone numbers or uploaded logo paths.

## Acceptance criteria

### Functional

- Super Admin provisions, enters, configures, suspends, and manages any tenant.
- Tenant admins configure identity, terminology, branches, policies, users, and teams only when granted the relevant capabilities.
- Company settings cover logo/contact/report footer, one company-wide terminology set, working days/hours, timezone/locale, GPS radius, signature/refusal/unavailable policy, approval/late/exception rules and enabled modules; branch-specific terminology remains deferred.
- Teams preserve supervisor, skills/categories, active membership history and one responsible lead; assistants may contribute only when their capability allows it.
- Platform administration exposes plan/user/task limits, usage/evidence volume, last activity, sync/import health and logged support notes/actions.
- Deactivated users retain historical attribution but cannot authenticate or receive new work.

### Test coverage required for sign-off

- God-mode tenant switching, stale context, destructive approval, plan limits, suspension, unusual/Unicode terminology across web/mobile/report, working calendars, support notes, inactive/locked users, cross-branch/team membership, lead uniqueness and audit trails pass.
