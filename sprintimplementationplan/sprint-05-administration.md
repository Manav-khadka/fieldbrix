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

- [x] Add tenant lifecycle state machine and enforce limits transactionally; record why/actor for every state or limit change. (Verified: `PlatformService.updateTenant/suspendTenant/restoreTenant` — `ACTIVE/SUSPENDED/ARCHIVED` transitions, `ARCHIVED_TENANT_IMMUTABLE` guard, required-reason validation, `record()` audit calls on every transition.)
- [x] Build platform tenant list/detail/health/usage/provision flows and god-mode entry; persistent banner remains visible on every tenant screen. (Verified: backend flows are real (`listTenants/tenantDetail/tenantUsage/createTenant`, `startGodSession`/`endGodSession`); the god-mode session (`godSession`) is now lifted to `App` and rendered as a persistent `.app-god-banner` in the app shell — visible across every view (Overview/Tenants/Company/People/Roles/Security/Files/Sessions/Operations), not just the Tenants tab. `GodMode`'s start form still lives in the Tenants tab as the entry point; `End context` is reachable from both the shell banner and the Tenants panel.)
- [x] Build tenant settings for logo/colors/terms/timezone/locale/date/number formats, working hours, policies and validation preview. (Verified: locale/timezone/working-days/working-hours/terminology were already implemented and validated; `PlatformService.updateCompany` now also validates `colorTheme` (6-digit hex), `dateFormat`/`numberFormat` (fixed allowed sets — `COMPANY_DATE_FORMATS`/`COMPANY_NUMBER_FORMATS`), and `logoObjectKey` (non-empty, ≤500 chars). Logo upload reuses the existing `/files/upload-intents` presigned-URL flow rather than a bespoke endpoint — `Company`'s settings tab in `App.tsx` uploads via the same checksum-verified pattern the Files screen already uses, then saves the resulting `uploadId` as `logoObjectKey`; the settings form also gets a native color picker and date/number-format selects, with a live preview panel showing the branded heading and a color swatch. Note: `logoObjectKey` is stored as an opaque reference to the upload — there is no server-side check yet that the object actually belongs to the tenant beyond the existing per-tenant checksum/upload-intent flow. Covered by 5 new tests in `platform.service.company-settings.spec.ts` (10 total, all passing); full backend suite (131 tests) and frontend typecheck green.)
- [x] Cover contact/report footer, one company-wide terminology set, working days/hours, GPS radius, signature/refusal/unavailable, approval/late/exception policies and enabled modules; explicitly reject branch-specific terminology in this phase. (Verified: `CompanySettingsDto` + `PlatformService.updateCompany` — `contactFooter`, `reportFooter`, `gpsRadiusMeters` bounds check, `signaturePolicy/refusalPolicy/unavailablePolicy/approvalPolicy/latePolicy/exceptionPolicy` shape validation, pre-existing `BRANCH_TERMINOLOGY_NOT_ALLOWED` guard; unit-tested in `platform.service.company-settings.spec.ts`.)
- [x] Implement branches and teams with no cycles, one active membership rule where required, lead history and safe reassignment on deactivation. (Verified: administration service/repository membership and lead-history paths.)
- [x] Implement invitation expiry/reissue/cancel/accept and generic failure responses; do not email credentials. (Verified: `PlatformService.inviteUser` — 7-day expiry, `cancelInvitation`/`reissueInvitation`, `acceptInvitation` returns generic `INVITATION_INVALID` for expired/already-accepted/unknown tokens, `notifications.sendInvitation` sends the token only, never a password.)
- [x] Implement skills taxonomy and user-skill assignment; use stable IDs so renamed skills preserve history. (Verified: `skills`, `user_skills`, repository persistence and stable UUID references.)
- [x] Preserve team supervisor, skills/categories, temporal members and one responsible lead; model assistant contribution permissions separately from final-submit authority. (Verified: single `leadUserId` per team with `recordTeamLead` history, temporal `team_memberships` (`starts_at`/`ends_at`); lead-vs-assistant submission authority is a task-execution concept scoped to Sprint 10, tracked there.)
- [x] Expose plan/user/task limits, active/completed counts, evidence volume, last activity and repeated sync/import/inactivity health with append-only support notes/actions. (Verified: limits/usage counts/append-only support notes were already real (`tenantUsage`, `ensureLimit`, DB `reject_support_note_mutation` trigger). `syncHealth`/`lastActivityAt` are now computed on every `tenantUsage()` call by `PlatformRepository.computeSyncHealth` — `lastActivityAt` is `MAX(created_at)` from `outbox_events` (the tenant's real, indexed sync timeline via `outbox_tenant_idx (tenant_id, created_at DESC)`, populated by tasks/workflows/imports/master-data mutations — a materially better activity signal than the platform module's own narrow `audit_logs` trail, which the first draft of this used and which a live check against the real DB showed was empty despite real tenant activity); `degraded` fires on any `DEAD_LETTERED` outbox event or `FAILED`/`PARTIAL` import job in the last 24h, `inactive` fires when there's no activity or the last activity is >14 days old. Live-verified against the running local stack: `GET /platform/tenants/:id/usage` returned a real `lastActivityAt` timestamp matching an actual customer-creation event and correctly flagged `degraded` from a real import job with row errors. Covered by 5 new tests in `platform.repository.compute-sync-health.spec.ts`; full backend suite (136 tests) green.)
- [x] Revoke sessions/devices/capability cache on tenant suspension or user deactivation; preserve creator/assignee attribution. (Verified: platform service and repository revocation paths.)
- [x] Enforce plan/usage counters server-side and make near-limit/limit errors explicit, observable and testable. (Verified: `ensureLimit`, tenant usage and limit update paths.)

## Dependency and Sentry implementation

- Add `cmdk`, phone input, branding color/crop and `driver.js` only through owned capability-aware adapters; test keyboard navigation, contrast, MIME/crop handling and absence of unavailable commands.
- Trace provisioning/invitation/branding/god-mode operations across React/Nest with normalized names and scrub names, emails, phone numbers, support notes and logo/object paths.

## Code-principle gate

- [ ] SRP: tenant lifecycle, company settings, branches, teams, invitations, skills and limits use distinct services/repositories. Not met at the implementation layer: `AdministrationController`/`AdministrationService` are cleanly split by concern, but `AdministrationService` is a thin passthrough — nearly every method's actual logic lives in `PlatformService` (2,600+ lines), which is a single god-class also owning auth, sessions, god-mode, audit and roles. The sprint-05 *contract surface* is well-separated; the code behind it is not. Real, pre-existing, out of this session's bounded scope to refactor.
- [ ] OCP: settings/limits/terminology extend typed registries and validators rather than tenant-specific branches. Not met: `PlatformService.updateCompany` validates each setting (`gpsRadiusMeters`, `signaturePolicy`, `refusalPolicy`, …) via a hand-written chain of `if` statements (a `for...of` loop over a static required-keys map for the policy objects, but GPS radius, locale, timezone and working-hours are each their own inline `if`) — adding a new setting means editing this method, not registering a new validator.
- [ ] LSP/ISP/DIP: invitation/mail and usage providers implement focused ports; administration domain does not depend on infrastructure SDKs. Partial: invitations go through `NotificationsService`/`NotificationDeliveryPort` (a real port, currently one "temporary email adapter" implementation) — that part is genuinely port-based. But `PlatformService` directly constructor-injects `StorageService`, `QueueService`, `DatabaseService` (concrete infrastructure classes, not interfaces it owns), so the domain-owns-its-ports requirement is not met overall.
- [x] DRY/KISS/YAGNI: lifecycle/limit rules are centralized; no deferred billing or subscription automation is built. (Verified: `ensureLimit` is the single limit-checking path used by tenant updates and invitation acceptance; no billing/subscription code exists anywhere in the module.)
- [x] Fail Fast: tenant status, revision, limit, scope and hierarchy validation precede session, membership and settings mutations. (Verified extensively during the Sprint 05 close-out earlier this session — status/revision/limit checks all throw before any mutation or session-revocation side effect.)
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path. Partial: early-return guard clauses are used consistently (Fail Fast above), but `PlatformService`'s size means many call sites reach through several collaborators (`this.repository.x`, `this.tenantContext.y`, `this.notifications.z` all from one 2,600-line class) rather than each concern talking to one direct collaborator — a symptom of the same SRP gap noted above, not a separate defect.

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
