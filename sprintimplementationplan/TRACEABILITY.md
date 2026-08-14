# Technical Implementation Traceability

This is the engineering companion to the [product traceability matrix](../sprintplans/TRACEABILITY.md). It maps the approved SQL baseline and engineering standards into implementation ownership and prevents a feature from being declared complete while its persistence, API, authorization, telemetry, tests, or operational evidence are missing.

## Definition of traced

A requirement is technically traced only when its owning sprint identifies:

- data ownership, migration, constraints, indexes, RLS and rollback;
- endpoint/event/job contract, permissions/scope, idempotency and error behavior;
- backend/web/mobile or platform components and integration boundaries;
- structured operational logs, immutable audit, metrics, Sentry spans/issues and alerts;
- unit, integration, contract, E2E, security, accessibility, performance and relevant LambdaTest coverage;
- deploy, compatibility, reconciliation, recovery and QA sign-off evidence.
- dependency owner/need, compatible stable resolution, deprecation/advisory/license result, lockfile and rollback evidence;
- the owning Sentry project/release, scrubber, source-map/symbol, alert and runbook evidence.

The sprint files provide those details. The table below is the audit index.

## Sprint implementation coverage

| Sprint | Primary requirements | Schema/API ownership | Critical cross-cutting proof |
|---:|---|---|---|
| 01 | Reproducible local/prod foundation | Infra modules; `/health/live`, `/health/ready`, `/version` | AWS STS evidence; dependency/license policy; `fieldbrixxx/{vite-react,nest,flutter,lambdas}`; rollback and Sentry/LambdaTest plumbing |
| 02 | Shared application/data platform | Baseline migrations, RLS, idempotency/audit/outbox, file/queue contracts, API envelope/OpenAPI | Composite tenant FKs, UUID policy, DB privilege roles, redacted logs, adapter contract tests |
| 03 | Password authentication and tenant isolation | Credentials, sessions, reset/lockout, devices and tenant selection APIs | bcrypt, rotation/reuse, session revocation, RLS/IDOR and browser/device auth matrix |
| 04 | Dynamic RBAC and god mode | Role/permission/feature/capability tables/APIs; god session and dual-approval APIs | Endpoint permission inventory, scope query constraints, cache invalidation, immutable privileged audit |
| 05 | Tenant/company/people administration | Tenant settings, branches, users, invitations, teams/skills/limits/support notes | Terminology/policy propagation, suspension/revocation, historical attribution, platform/tenant scope |
| 06 | Master records and imports | Customer/site/target/parts and import job/row APIs; user-import integration | Soft delete, `citext`, trigram indexes, composite FKs, spreadsheet security and row provenance |
| 07 | Workflow builder | Draft aggregate, sections/fields/options and lookup APIs | Complete field/property registry, extension without switches, large accessible editor |
| 08 | Rules and advanced fields | Rule AST/operators/actions/simulations and advanced field metadata | Cross-runtime fixtures, safety precedence, privacy/report behavior, cycles/fuzz/performance |
| 09 | Workflow governance/templates | Immutable workflow snapshots/hash, versions, platform templates | DB UPDATE/DELETE denial, task pinning, concurrent publish and deep-copy reference rewrite |
| 10 | Tasks/assignments | Task/attachment/request/transition/assignment/history APIs | Exact status/flag matrix, lead/assistant rules, concurrency, version pinning, worker requests/reopen |
| 11 | Bulk/recurrence/notifications | Task imports, recurrences/exceptions/scheduler and inbox APIs | Timezone/DST, once-only generation, exact notification catalogue and missed/upcoming views |
| 12 | Mobile alpha/duty/offline shell | Mobile bootstrap/tasks/history/duty and sync APIs; encrypted local schema | Local-first repositories, capability navigation, restart/offline/low-end real devices |
| 13 | Mobile execution/evidence | Runs/answers/GPS/evidence/parts/registration request APIs | Field matrix, check-in target rules, reference evidence, lead submit, capture provenance |
| 14 | Sync/conflicts | Ordered mutation, delta, reconcile, media parts/finalize and atomic commit | Replay receipts, conflict/quarantine, cursor transaction, storage/corruption/full-day chaos |
| 15 | Signature/review | Confirmation/submission/review/correction/follow-up/target-registration decision APIs | Summary/signature hash, immutable runs/evidence, exception decisions and selective correction |
| 16 | Dashboards/reports/PDF/SMTP | Named report/export/service-report and SMTP profile/delivery APIs/jobs | Metric reconciliation, PDF content/hash, encrypted write-only secrets and fail-closed sender routing |
| 17 | Sector templates/beta | 12 manifests, fixtures, acceptance vectors and compatibility matrix | Every branch/safety/report, four-pilot E2E, no sector-specific core code |
| 18 | Paid-pilot release | Frozen MVP contracts/manifests | All DOCX critical journeys/failures, security, performance, restore/rollback and pilot KPI baseline |
| 19 | Portal | Separate portal auth/contact grants/service requests/comments/files/conversion APIs | Token-domain separation, customer/site RLS, responsive accessibility and tenant SMTP |
| 20 | Contracts | Effective-dated contracts/coverage/allowance/entitlement/renewal APIs | Temporal/overlap/concurrency, pinned entitlement snapshot, portal/task/mobile/email integration |
| 21 | Invoices | Draft/issue/status/credit/PDF/email/portal APIs | Minor-unit math, tax/rounding, concurrent numbering, issue immutability and bounded credits |
| 22 | Tracking/feedback | Consented tracking session/locations/token/feedback/escalation APIs | No off-duty exposure, token privacy, retention, stale state, provider adapter and battery/load |
| 23 | Multi-site/SLA/branding | Contact site grants, SLA versions/instances/reports, branding/domain APIs | Shared scope resolver, SLA reconciliation, injection/cache/domain/certificate security |
| 24 | Growth GA | Final manifests and operational controls | Full cross-feature regression, god/RBAC/RLS campaign, LambdaTest matrix, synthetics and recovery |

## Baseline schema migration ledger

The SQL file models the original fixed-role/OTP MVP. Sprint 02 must turn it into a migration ledger rather than treating it as already equal to the approved target.

| Delta | Migration owner | Mandatory implementation/test |
|---|---:|---|
| Preserve extensions, UUIDv7 entity IDs, composite tenant PK/FK, RLS/FORCE RLS, soft delete, triggers, checks and indexes | 02 | Schema-diff test compares Prisma migrations to SQL constructs Prisma cannot express |
| Add password credentials/history, session families, reset/lockout and idempotency/outbox/hash-chain audit | 02–03 | Empty/baseline/up/down/reapply and secret/log tests |
| Replace `membership_role` and `permission_overrides` | 04 | Map original three roles plus approved presets into dynamic roles/grants; no membership loses its intended base access |
| Add platform role/capability, immutable Super Admin, god context and destructive approval | 04 | Platform/tenant guard separation and dual-approval state-machine tests |
| Remove/deactivate OTP field/confirmation paths | 02, 08, 15 | No UI/API/runtime accepts OTP; migration handles enum/table compatibility and rollback explicitly |
| Enforce published/submitted/evidence/audit immutability at DB privilege layer | 02, 09, 14–16 | Direct UPDATE/DELETE tests with runtime DB role fail |
| Add missing task attachments, worker action requests, recurrence exceptions/checkpoints, correction revisions and delivery attempts | 10–16 | Contract/migration/RLS/idempotency/replay tests |
| Add SMTP and Growth schemas | 16, 19–23 | Each owner supplies migration up/down, composite FKs, RLS, indexes, retention and data classification |

## Schema-to-code non-negotiables

- Entity IDs: UUIDv7. Mutation/idempotency keys: UUIDv4. Never conflate the two validation rules.
- Tenant data: application obtains tenant from verified session/god context, sets transaction-local DB context, adds repository `tenantId` filters and relies on forced RLS plus composite tenant FKs as defense in depth.
- Time: `timestamptz`/UTC persistence, database clock for trusted server timestamps, tenant/branch timezone at schedule/display boundaries.
- Money: integer minor units and explicit currency/tax/rounding snapshots.
- Files: bytes in S3-compatible storage; database stores safe key, MIME, size, SHA-256, capture provenance and lifecycle only.
- Immutable records: published workflow versions, submitted task-run snapshots/evidence, reports, issued invoices/credits and audit rows cannot be updated/deleted by the runtime DB role.
- Performance: every new filter/join gets an index decision and `EXPLAIN ANALYZE`. Monthly partitioning, PostGIS, read replicas and materialized views are threshold-driven ADRs, not automatic architecture.
- JSONB is limited to variable policy/configuration/details with a documented JSON schema/version; relational identity, authorization, financial facts and lifecycle states remain typed/relational.

## Dependency and Sentry non-negotiables

- [`../react-libraries.md`](../react-libraries.md) owns candidate status and sprint assignment; manifests/lockfiles own installed versions. Resolve the latest compatible stable, reject deprecated/discontinued/vulnerable packages and permit only approved open-source frontend runtime licenses.
- Paid/premium UI packages and license keys are prohibited. React Big Calendar owns scheduling; `react-data-grid@7.0.0-beta.61` is the sole exact-pinned prerelease exception; SheetJS uses the reviewed official `0.20.3` tarball; MapLibre is limited to Sprint 22 consented tracking.
- `fieldbrixxx/{vite-react,nest,flutter,lambdas}` are separate release/alert domains. DSNs come from environment configuration, `SENTRY_AUTH_TOKEN` is CI-only, replay is disabled until masking approval, and secrets/PII/payloads/evidence/location/presigned URLs are prohibited.

## Complete engineering-principle gate

The implementation [master README](README.md) makes SOLID, DRY, KISS, YAGNI and Fail Fast explicit. The following additional guide principles are equally mandatory:

- Law of Demeter: components talk to their direct collaborators; web/mobile views call use cases/hooks/providers, not nested SDK/repository chains.
- Explicit over implicit: state machines, permission keys, scope, event versions, units, money/time rules and side effects are named and typed; no magic strings or hidden lifecycle behavior.
- Early return: reject authentication, authorization, validation, stale version and invariant failures at the boundary; keep the successful path flat and ensure rejected operations produce zero side effects.

Architecture tests must enforce module/import boundaries. Code review evidence must show that every new endpoint/table/type maps to current acceptance (YAGNI), shared business knowledge has one authoritative source (DRY), and provider implementations pass common port contract tests (LSP/DIP).

## Requirement-change control

When a source or product decision changes:

1. Update the product traceability row and identify the superseded decision.
2. Update the owning sprint’s scope, acceptance criteria and QA coverage without hiding capacity impact.
3. Update this technical row, schema migration ledger and public contract/API/event versions.
4. Regenerate clients/fixtures and update permission, logging, Sentry, test and LambdaTest matrices.
5. Record an ADR when the change affects source precedence, tenant isolation, immutability, offline conflict behavior, god mode, privacy, or money.
