# Sprint 05 — Platform and Company Administration

Source: [Sprint plan](../sprintplans/sprint-05-administration.md) · Prerequisite: Sprint 04 QA sign-off · Status: `IN PROGRESS` · Target: 64 points

## Outcome and data model

Platform Super Admin can provision, enter, configure, suspend, archive and inspect any tenant; authorized tenant users can manage only their company. Add tenant profile/status/limits, branding/terminology/settings, branches, teams, invitations, memberships, skills and historical attribution. Suspension denies tenant sessions without deleting history. Irreversible deletion uses Sprint 04 approval—not a direct endpoint shortcut.

## API contracts

| Method | Path | Permission | Contract highlights |
|---|---|---|---|
| GET/POST | `/platform/tenants` | Platform tenant view/create | filter/health/usage or provision tenant; mutation idempotent |
| GET/PATCH | `/platform/tenants/:tenantId` | Platform tenant view/edit or god | profile, status, limits; optimistic revision |
| POST | `/platform/tenants/:tenantId/suspend` | Platform tenant suspend | reason/idempotency; revoke access, retain data |
| POST | `/platform/tenants/:tenantId/archive-request` | Active god session | creates destructive approval request |
| GET/PATCH | `/company` | `company.settings.view/edit` | own tenant branding/terminology/policies |
| GET/POST/PATCH | `/branches[/:branchId]` | `company.branches.*` + scope | branch CRUD, timezone/working settings |
| GET/POST/PATCH | `/teams[/:teamId]` | `company.teams.*` + scope | team/lead/membership management |
| GET/POST | `/users` | `iam.users.view/invite` | paginated workforce users/invitation |
| PATCH | `/users/:userId` | `iam.users.edit` | profile, skills, active state; not roles |
| POST | `/users/:userId/deactivate` | `iam.users.deactivate` | reason/idempotency; revoke sessions |
| POST | `/invitations/:token/accept` | Public token | set password/accept membership; single use |
| GET/POST | `/platform/tenants/:tenantId/support-notes` | Platform support/god | append/list reasoned support notes; never invisible mutation |

## Implementation checklist

- [ ] Add tenant lifecycle state machine and enforce limits transactionally; record why/actor for every state or limit change.
- [ ] Build platform tenant list/detail/health/usage/provision flows and god-mode entry; persistent banner remains visible on every tenant screen.
- [ ] Build tenant settings for logo/colors/terms/timezone/locale/date/number formats, working hours, policies and validation preview.
- [ ] Cover contact/report footer, one company-wide terminology set, working days/hours, GPS radius, signature/refusal/unavailable, approval/late/exception policies and enabled modules; explicitly reject branch-specific terminology in this phase.
- [x] Implement branches and teams with no cycles, one active membership rule where required, lead history and safe reassignment on deactivation. (Verified: administration service/repository membership and lead-history paths.)
- [ ] Implement invitation expiry/reissue/cancel/accept and generic failure responses; do not email credentials.
- [x] Implement skills taxonomy and user-skill assignment; use stable IDs so renamed skills preserve history. (Verified: `skills`, `user_skills`, repository persistence and stable UUID references.)
- [ ] Preserve team supervisor, skills/categories, temporal members and one responsible lead; model assistant contribution permissions separately from final-submit authority.
- [ ] Expose plan/user/task limits, active/completed counts, evidence volume, last activity and repeated sync/import/inactivity health with append-only support notes/actions.
- [x] Revoke sessions/devices/capability cache on tenant suspension or user deactivation; preserve creator/assignee attribution. (Verified: platform service and repository revocation paths.)
- [x] Enforce plan/usage counters server-side and make near-limit/limit errors explicit, observable and testable. (Verified: `ensureLimit`, tenant usage and limit update paths.)

## Dependency and Sentry implementation

- Add `cmdk`, phone input, branding color/crop and `driver.js` only through owned capability-aware adapters; test keyboard navigation, contrast, MIME/crop handling and absence of unavailable commands.
- Trace provisioning/invitation/branding/god-mode operations across React/Nest with normalized names and scrub names, emails, phone numbers, support notes and logo/object paths.

## Code-principle gate

- [ ] SRP: tenant lifecycle, company settings, branches, teams, invitations, skills and limits use distinct services/repositories.
- [ ] OCP: settings/limits/terminology extend typed registries and validators rather than tenant-specific branches.
- [ ] LSP/ISP/DIP: invitation/mail and usage providers implement focused ports; administration domain does not depend on infrastructure SDKs.
- [ ] DRY/KISS/YAGNI: lifecycle/limit rules are centralized; no deferred billing or subscription automation is built.
- [ ] Fail Fast: tenant status, revision, limit, scope and hierarchy validation precede session, membership and settings mutations.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `tenant_provisioned/status_changed/limit_hit`, `company_settings_changed`, `branch/team/user/invitation_*`; safe IDs, revision and duration |
| Audit | full settings and membership diffs, god reason/session, suspension impact, invitation lifecycle; never include invitation token |
| Sentry | tenant-provisioning and invitation traces; React route/error boundaries; tag module/operation/status, not names/emails |
| Metrics/alerts | tenant provision latency/failure, active/suspended count, invitation success/failure, limits reached, session-revocation lag; alert on provisioning partial failure or suspended access success |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test lifecycle/limits, terminology validation, team rules, invitations and deactivation to ≥80%.
- [ ] Endpoint tests cover happy path plus invalid revision, wrong scope, suspended tenant, duplicate, inactive user and cross-tenant probe.
- [ ] Integrate settings with RBAC, capabilities, audit, auth revocation, placeholder email sender and god-mode context.
- [ ] Verify unusual Unicode/RTL terminology, invalid colors/logos, timezone boundaries, duplicate branch/team names and inactive leads.
- [ ] Run tenant lifecycle security matrix including forged platform role, stale god context, archive self-approval and data retention.
- [ ] LambdaTest web: platform tenant console, tenant settings, branches, teams, invitations and responsive navigation in Chrome/Edge/Firefox/Safari; keyboard and WCAG scans.
- [ ] LambdaTest mobile: login to active/suspended/deactivated states and refreshed branding/terminology on low-end/current Android and iPhone.
- [ ] Load 10k users/1k branches in fixture; paginate, index and record EXPLAIN ANALYZE for search/filter queries.

## Delivery and sign-off

- [ ] Update OpenAPI/generated clients, permission inventory, tenant lifecycle diagram, limit catalogue, suspension/restore and support runbooks.
- [ ] CI gates migrations, tenant/RLS matrix, web component/Playwright, mobile state checks, accessibility and security tests.
- [ ] Smoke provision → configure → invite → login → suspend → deny → restore in isolated production tenant; inspect logs/Sentry/audit.
- [ ] Attach API, query plans, LambdaTest, audit, alerts and god-mode evidence; QA sign-off blocks Sprint 06.
