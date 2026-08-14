# Sprint 04 — Dynamic RBAC, God Mode, and Audit

Source: [Sprint plan](../sprintplans/sprint-04-authorization.md) · Prerequisite: Sprint 03 QA sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and invariants

Deliver dynamic tenant authorization and the separate Platform Super Admin god-mode path. Ten workforce presets are cloneable; blank arbitrarily named roles are allowed; users can hold multiple additive allow-only roles; default is deny. God mode is immutable, unrestricted across tenants, and subject to context/reason/re-auth/audit controls—not tenant permission checks.

## Data and evaluation model

- Tables: `roles`, `permissions`, `role_permissions`, `tenant_user_roles`, feature/dashboard registry, capability revisions/cache, platform administrators, god sessions, destructive requests/approvals/executions, and audit evidence.
- Permission key form: `<module>.<resource>.<action>`; grant contains feature/dashboard visibility and optional scope (`own|team|branch|all`). Effective grants union across active roles and resolve to the broadest allowed scope.
- Presets are seeded templates, not fixed runtime enums. Customer portal identities cannot be assigned workforce/platform roles.
- God session contains platform admin, selected tenant, mandatory reason, re-auth time, creation/expiry, session and correlation IDs. Every request verifies platform identity and active god session. Tenant deny rules are never evaluated.
- Destructive execution requires an unexpired approval by a different active administrator with approval capability; request parameters are immutable and execution is once-only.

## API contracts

| Method | Path | Permission/access | Contract highlights |
|---|---|---|---|
| GET/POST | `/roles` | `iam.roles.view/create` | list or create blank role; mutation is idempotent |
| GET/PATCH/DELETE | `/roles/:roleId` | `iam.roles.view/edit/delete` | immutable preset source retained; in-use delete returns `422` |
| POST | `/roles/:roleId/clone` | `iam.roles.create` | arbitrary name + copied grants; cannot clone platform role |
| PUT | `/roles/:roleId/permissions` | `iam.roles.configure` | complete grant set + revision/idempotency; optimistic concurrency |
| PUT | `/users/:userId/roles` | `iam.assignments.configure` | additive role IDs; tenant-local only |
| GET | `/permissions` | `iam.roles.view` | registry/actions/scopes/dashboard features |
| GET | `/me/capabilities` | Authenticated | effective feature, action, scope grants + revision |
| POST | `/platform/god-sessions` | Platform Super Admin | tenantId, reason, password re-auth, idempotency → short-lived context |
| GET/DELETE | `/platform/god-sessions/current` | Platform Super Admin | inspect/exit context; banner source |
| POST | `/platform/destructive-requests` | Active god session | action, target, immutable payload, reason, idempotency |
| POST | `/platform/destructive-requests/:id/approve` | Platform approver | different admin; idempotency; no self-approval |
| POST | `/platform/destructive-requests/:id/execute` | Requester/authorized admin | exact approved payload, once only |
| GET | `/audit-events` | `audit.events.view` or platform audit | filtered/paginated, PII-masked by authority |

## Implementation checklist

- [ ] Seed the permission/feature/dashboard registry and ten cloneable presets with stable keys and migration tests.
- [ ] Migrate every existing `tenant_users.role`/`permission_overrides` membership into equivalent roles/grants/assignments, reconcile counts and effective capabilities, then remove the old authorization path without dual-write ambiguity.
- [ ] Implement capability evaluator, scope resolver, NestJS permission decorator/guard, ownership/team/branch query constraints, cache/revision invalidation and decision trace for support.
- [ ] Require every protected controller method to declare permission and supported scopes; CI fails on undecorated protected endpoints.
- [ ] Build React role list/editor, blank/clone flow, capability matrix, dashboard-feature selection, assignment UI, impact preview and accessible confirmation.
- [ ] Derive routes, navigation, buttons and dashboard widgets only from `/me/capabilities`; never treat hiding as authorization.
- [ ] Implement platform authorization before tenant RBAC, explicit god-session middleware and persistent non-dismissible tenant/reason/expiry banner.
- [ ] Implement re-auth freshness, inactivity/absolute expiry, tenant-switch invalidation, privileged action audit, alerts and emergency session revocation.
- [ ] Implement two-person approval state machine: REQUESTED → APPROVED/REJECTED/EXPIRED → EXECUTED/FAILED; bind payload hash and reject self/stale/changed execution.
- [ ] Make god mode impossible to list as assignable, clone, edit, delete or restrict; Support/Compliance remain scoped platform roles.

## Dependency and Sentry implementation

- Build role/capability matrices with approved TanStack Table/Virtual and owned Radix/shadcn components; tables consume the authoritative capability response and provide keyboard/screen-reader coverage.
- Add `tenant_rbac|god_mode` trace context using low-cardinality tags. Page forged/self-approval/invariant failures, keep ordinary forbidden outcomes in metrics and prove no privileged reason or identity leaks.

## Code-principle gate

- [ ] SRP: capability evaluation, scope resolution, tenant guards, god-session validation, approval workflow and audit writing remain separate.
- [ ] OCP: permissions/features/actions/scopes extend registries/policies; new protected features do not require rewriting the evaluator.
- [ ] LSP/ISP/DIP: tenant and god authorization paths implement explicit focused contracts while preserving their distinct invariants; domain owns interfaces.
- [ ] DRY/KISS/YAGNI: permission keys/scope semantics have one source; no deny engine or speculative policy language is added.
- [ ] Fail Fast: permission, scope, god context, re-auth and approval payload checks complete before any protected read/write or irreversible action.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, audit, Sentry, and alerts

| Signal | Required implementation |
|---|---|
| Logs | `authorization_allowed/denied` (sample allowed, retain denied), `capabilities_rebuilt`, `role_*`, `god_session_started/expired/ended`, `destructive_request_*`; include decision path and safe IDs |
| Audit | Full role/grant/assignment diffs; every god action records platform admin, effective tenant, reason, session, affected records and before/after; approval and execution are separate immutable events |
| Sentry | Spans for capability evaluation/cache and approval execution; tag auth path `tenant_rbac|god_mode`; forbidden attempts are breadcrumbs/metrics, forged/self-approval bugs are captured and paged |
| Metrics/alerts | decision latency/cache hit, 403 rate, capability revision lag, active god sessions, failed re-auth, god action volume, destructive request age; immediate alert on forged context/self-approval/audit failure |

## Integration, test, and LambdaTest checklist

- [ ] Truth-table tests cover blank roles, each preset, additive grants, deny-by-default and own/team/branch/all resolution.
- [ ] Migration tests prove original Company Admin/Supervisor/Field Worker access intent survives, override data is mapped or explicitly rejected with a report, and rollback does not orphan assignments.
- [ ] For every protected API, matrix-test no role, one role, multiple roles, wrong scope, stale capabilities, tenant switch, disabled assignment and god bypass.
- [ ] Prove tenant-created roles cannot obtain platform keys or cross-tenant records; forge headers/JWT/god session IDs and attempt direct endpoint/DB access.
- [ ] Test role edits during an active web/mobile session invalidate capabilities before the next protected operation.
- [ ] Test god tenant selection, reason required, recent re-auth, banner, expiry, switching, direct CRUD/export/configure/delete, and tenant deny bypass.
- [ ] Test destructive request payload hashing, second approver, self-approval rejection, inactive approver, expiry, replay, changed target, execution failure and re-attempt policy.
- [ ] Verify operational logs and append-only audit independently; tamper with audit chain and prove alert/reconciliation detects it.
- [ ] LambdaTest web: full role editor/assignment/capability-driven dashboard in all browsers; keyboard matrix editing; two simultaneous admin sessions; god banner at desktop/mobile widths.
- [ ] LambdaTest mobile: capability-driven navigation and stale-revision refresh on low-end/current Android and iPhone; god mode is not exposed in workforce app.
- [ ] Load-test 100-role/1,000-grant users and capability cache invalidation; document p95 target and query plans.

## Delivery and sign-off

- [ ] Publish registry catalogue, default preset fixtures, endpoint-permission inventory, scope semantics, authorization sequence, god-mode threat model and destructive-operation runbook.
- [ ] CI gates decorator inventory, authorization matrix, RLS/IDOR, capability contract drift, web/mobile visibility, audit-chain verification and security scans.
- [ ] Production test tenants demonstrate arbitrary role + dashboard grant, additive roles, deny-by-default and an audited god-mode action with dual approval.
- [ ] Attach test matrices, audit records, alert evidence, Sentry traces, LambdaTest builds and security review.
- [ ] Authorization QA/Security sign-off blocks all dependent feature work.
