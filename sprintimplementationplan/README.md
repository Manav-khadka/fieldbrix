# FieldBrix Sprint Implementation Plans

This directory turns the approved [24-sprint roadmap](../sprintplans/README.md) into an engineering execution system. Each sprint file is a build contract: architecture, schema changes, API surface, telemetry, security, integration tests, LambdaTest coverage, release evidence, and explicit QA sign-off.

Coverage is audited in the [technical implementation traceability matrix](TRACEABILITY.md), paired with the roadmap’s [product traceability matrix](../sprintplans/TRACEABILITY.md). These reconcile the original DOCX requirements and 46-table SQL baseline with later locked decisions; both matrices are mandatory sign-off inputs.

## How to use this tracker

1. The Engineering Lead sets the sprint row to `IN PROGRESS`, assigns owners, and links tickets before development starts.
2. Owners check items only when evidence exists in the linked PR, workflow run, Sentry release, LambdaTest build, migration rehearsal, or test report.
3. QA changes a sprint to `IN QA` only after implementation and developer verification are complete.
4. The QA Lead changes it to `DONE` only when every required gate in the sprint file is checked and the prerequisite sprint has sign-off.
5. A blocked item records an owner, blocking dependency, decision required, and review date. Never mark an incomplete check as complete to make the percentage look healthy.

Status values: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `IN QA` · `DONE`

## Master progress tracker

| Sprint | Implementation plan | Milestone | Status | Eng owner | QA owner | Planned | Completed | Evidence |
|---:|---|---|---|---|---|---|---|---|
| 01 | [Foundation](sprint-01-foundation.md) | — | IN PROGRESS | Platform | TBD | 2026-08-14 | — | [Sprint evidence](sprint-01-foundation.md#sprint-evidence-log) |
| 02 | [Application platform](sprint-02-application-platform.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 03 | [Authentication](sprint-03-authentication.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 04 | [Dynamic authorization and god mode](sprint-04-authorization.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 05 | [Platform and company administration](sprint-05-administration.md) | — | IN PROGRESS | TBD | TBD | — | — | [Sprint evidence](sprint-05-administration.md#implementation-checklist) |
| 06 | [Master data and imports](sprint-06-master-data.md) | — | IN PROGRESS | TBD | TBD | — | — | [Sprint evidence](sprint-06-master-data.md#implementation-checklist) |
| 07 | [Workflow builder](sprint-07-workflow-builder.md) | — | IN PROGRESS | TBD | TBD | — | — | [Sprint evidence](sprint-07-workflow-builder.md#implementation-checklist) |
| 08 | [Rule engine](sprint-08-rule-engine.md) | — | IN PROGRESS | TBD | TBD | — | — | [Sprint evidence](sprint-08-rule-engine.md#implementation-checklist) |
| 09 | [Workflow governance](sprint-09-workflow-governance.md) | — | IN PROGRESS | TBD | TBD | — | — | [Sprint evidence](sprint-09-workflow-governance.md#implementation-checklist) |
| 10 | [Task lifecycle](sprint-10-task-lifecycle.md) | — | IN PROGRESS | TBD | TBD | — | — | [Sprint evidence](sprint-10-task-lifecycle.md#implementation-checklist) |
| 11 | [Scheduling and notifications](sprint-11-scheduling.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 12 | [Mobile alpha](sprint-12-mobile-alpha.md) | Internal alpha | NOT STARTED | TBD | TBD | — | — | — |
| 13 | [Mobile execution](sprint-13-mobile-execution.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 14 | [Offline sync hardening](sprint-14-offline-sync.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 15 | [Signature and review](sprint-15-review.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 16 | [Reporting and SMTP](sprint-16-reporting-email.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 17 | [Industry beta](sprint-17-industry-beta.md) | MVP beta-ready | NOT STARTED | TBD | TBD | — | — | — |
| 18 | [MVP paid-pilot release](sprint-18-mvp-release.md) | Paid-pilot MVP | NOT STARTED | TBD | TBD | — | — | — |
| 19 | [Customer portal](sprint-19-customer-portal.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 20 | [Contracts and entitlements](sprint-20-contracts.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 21 | [Invoices and credit notes](sprint-21-invoicing.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 22 | [Tracking and feedback](sprint-22-tracking-feedback.md) | — | NOT STARTED | TBD | TBD | — | — | — |
| 23 | [Multi-site Growth RC](sprint-23-growth-rc.md) | Growth release candidate | NOT STARTED | TBD | TBD | — | — | — |
| 24 | [Growth GA qualification](sprint-24-growth-ga.md) | Growth GA | NOT STARTED | TBD | TBD | — | — | — |

## Portfolio checklist

### Sprint readiness

- [ ] Sprint 01 QA sign-off recorded before Sprint 02 begins.
- [ ] Sprint 02 QA sign-off recorded before Sprint 03 begins.
- [ ] Sprint 03 QA sign-off recorded before Sprint 04 begins.
- [ ] Sprint 04 QA sign-off proves dynamic RBAC and god mode before any protected product module begins.
- [ ] Sprint 05 QA sign-off recorded before tenant-owned master data begins.
- [ ] Sprint 06 QA sign-off recorded before workflow construction begins.
- [ ] Sprints 07–09 sign off builder, rules, and immutable versions in order.
- [ ] Sprints 10–11 sign off task lifecycle before mobile task consumption.
- [ ] Sprint 12 internal-alpha evidence is attached.
- [ ] Sprints 13–15 sign off execution, sync, and governed review in order.
- [ ] Sprint 16 signs off reporting and tenant-aware SMTP.
- [ ] Sprint 17 beta evidence covers all four pilot sectors.
- [ ] Sprint 18 paid-pilot release approval is recorded.
- [ ] Sprints 19–23 sign off Growth features in dependency order.
- [ ] Sprint 24 GA approval, rollback authority, and launch record are attached.

### Cross-cutting engineering gates

- [ ] Every sprint completes its explicit SOLID, DRY, KISS, YAGNI, and Fail Fast review; evidence is linked in the PR or sprint sign-off.
- [ ] Architecture remains Controller → Service → Repository → Prisma; domain modules do not import infrastructure directly.
- [ ] OpenAPI is the API source of truth and Flutter models are regenerated on contract changes.
- [ ] All public service methods have TSDoc, including every domain exception they can throw.
- [ ] Every mutation has a client-created UUID-v4 idempotency key and an immutable audit event.
- [ ] Tenant identity comes from verified authentication context, never request body/query/header.
- [ ] Every tenant-scoped repository query filters by `tenantId`; RLS is enabled and forced.
- [ ] God mode is a separate platform authorization path and cannot be cloned, assigned, or denied by tenant roles.
- [ ] Irreversible god-mode actions require a second, different authorized platform administrator.
- [ ] Secrets are stored in encrypted AWS SSM Parameter Store or encrypted with AES-256-GCM; no saved secret is returned by an API.
- [ ] Operational logs and audit records are implemented as separate systems.
- [ ] Sentry events, logs, traces, screenshots, and test artifacts contain no passwords, tokens, credentials, presigned URLs, or unmasked PII.
- [ ] Every changed dependency has owner/sprint need, latest-compatible-stable/deprecation/peer/license/advisory evidence and a committed lockfile; `react-data-grid@7.0.0-beta.61` is the sole exact-pinned prerelease exception.
- [ ] Frontend runtime dependencies use approved open-source licenses and no paid, proprietary, trial or premium-only UI package or license key.
- [ ] Weekly dependency-update PRs never auto-merge majors/prereleases and pass affected lint/type/build/unit/integration/accessibility/browser/device gates.
- [ ] Service/repository unit coverage is at least 80%; every endpoint has happy path plus its top three error paths.
- [ ] Every MVP story has HTTP → database → response E2E coverage.
- [ ] Web accessibility meets WCAG 2.2 AA for changed journeys.
- [ ] Mobile changes pass analyze, unit/widget, golden, emulator integration, and the sprint’s real-device matrix.
- [ ] Production deployment has a health check, smoke test, observable release marker, and tested rollback.

## Binding implementation contract

### Universal code principles from the technical implementation guide

These are mandatory review gates, not aspirational style notes:

| Principle | FieldBrix implementation rule | Review evidence |
|---|---|---|
| Single Responsibility | Controllers translate HTTP only; services orchestrate one domain use case; repositories persist/query; guards authorize; adapters integrate external systems. Split a class when it has more than one reason to change. | Changed classes have one named responsibility; controller has no business branching; service has no direct Prisma/SDK calls. |
| Open/Closed | Extend behavior through registries, strategies, policies, handlers, typed events, and dependency injection. Avoid central switches that must be edited for every field, permission, provider, rule action, or notification. | New variant is added by implementing/registering a contract; existing stable implementations remain unchanged except registration/composition. |
| Liskov Substitution | Every implementation of a port preserves its inputs, outputs, errors, idempotency, security, and observable behavior. Local/test adapters must be valid substitutes for AWS/SMTP/map/storage implementations. | Shared contract test suite passes against every adapter; no implementation requires caller-specific branching. |
| Interface Segregation | Consumers depend on small capability-focused ports and DTOs, not broad “god” services or provider SDKs. Read, write, approval, storage, mail and query concerns are separated when their consumers differ. | No consumer is forced to mock or implement unrelated methods; public interfaces expose only needed operations. |
| Dependency Inversion | Domain/application code owns ports and depends on abstractions; infrastructure implements them and is wired at the composition root. Domain modules never import Prisma, AWS, SMTP, Sentry, map, filesystem, or HTTP clients directly. | Import-boundary check and architecture test pass; infrastructure can be replaced in tests through injection. |
| DRY | Centralize business knowledge—permission keys, state transitions, error codes, schemas, calculations and policies. Do not merge coincidentally similar code belonging to different domain concepts. | One authoritative definition exists for each rule; generated clients/fixtures derive from it; extracted abstractions represent shared knowledge. |
| KISS | Choose the smallest design that satisfies current acceptance, security, offline and operational requirements. Prefer the modular monolith and explicit state machines over speculative services/frameworks. | ADR/PR explains material complexity; unnecessary layers, generic engines and indirection are removed. |
| YAGNI | Do not build deferred roadmap items, unused provider abstractions, speculative configurability or premature scaling. Create a ticket/ADR instead of dormant production code. | Every new type, endpoint, table, flag and abstraction maps to a current sprint acceptance criterion. |
| Fail Fast | Validate configuration at startup, DTOs at the boundary, invariants before side effects, schema/event versions before processing, and permissions before reads/writes. Return typed errors and leave zero partial state. | Invalid config prevents readiness; negative tests prove no DB/event/file/email side effect after rejection. |
| Law of Demeter | A component talks only to direct collaborators. Controllers/views do not reach through services, repositories, SDK clients or nested object graphs. | Import/architecture tests pass; mocks and call sites show one direct boundary per collaboration. |
| Explicit over Implicit | State transitions, permission keys, scopes, units, timezones, money, event/schema versions, side effects and ownership are named and typed. | No magic lifecycle strings or hidden defaults; public contracts and state/policy tables are reviewable. |
| Early Return | Authentication, authorization, validation, stale revision and invariant failures leave immediately before nesting or side effects. | Failure paths are flat, typed and prove zero DB/file/event/email mutation. |

Every sprint file contains the compact checklist below. Reviewers must apply it to the sprint’s changed modules and integrations, not merely check it once at project level.

### Standard two-week execution rhythm

This is the default sequencing inside every sprint; a sprint file may tighten it but may not move QA or contract work to an afterthought.

| Window | Required outcome |
|---|---|
| Before Day 1 | Prerequisite QA gate, scope, owners, environments, test identities/data and external dependencies confirmed |
| Days 1–2 | Acceptance scenarios, threat cases, data migration, API/OpenAPI/error/event contracts, UX states and telemetry names reviewed |
| Days 2–5 | Backend/repository/migration and adapter increments merged in small reviewed PRs with unit/integration tests |
| Days 3–7 | Web/mobile increments integrate generated contracts; loading/empty/error/offline/forbidden states are complete |
| Days 5–8 | Cross-feature, queue/storage/email/sync integrations and seeded E2E journeys run continuously |
| Days 7–9 | QA functional/edge/regression/security/accessibility/performance and LambdaTest matrix; defects fixed and re-tested |
| Day 9 | Production-test deployment, migration/rollback rehearsal, Sentry/CloudWatch/alert verification and evidence assembly |
| Day 10 | Acceptance demo, reconciliation, QA/security/product sign-off as applicable, tracker update and next-sprint gate |

An endpoint or migration may not be considered “implemented” while its contract, error paths, telemetry, tests or rollback evidence remain unchecked.

### API and endpoint rules

- Base path is `/api/v1`; endpoint tables in sprint files show paths relative to that prefix.
- All responses use the handbook envelope. Success returns `success`, `data`, and `meta`; lists also return `pagination`. Errors return `success: false` and a typed `error` with `requestId` and `timestamp`.
- `200` is used for successful actions with `data: null`; `204` is forbidden. `201` creates a resource; `400` is malformed input; `401` authentication; `403` capability failure; `404` absent or cross-tenant probe; `409` replay/unique conflict; `422` valid input violating a domain rule; `429` throttling; `500` sanitized unexpected failure; `503` unavailable dependency.
- Global validation uses whitelist, forbidden unknown fields, explicit conversion only, and DTO-generated OpenAPI schemas.
- `X-Correlation-Id` flows through browser/mobile, API, queues, Lambdas, logs, traces, audit metadata, and error evidence. `X-Request-Id` echoes the effective correlation ID.
- Every protected operation declares one stable permission key and supported scope (`own`, `team`, `branch`, `all`). The API is authoritative; UI visibility consumes `GET /me/capabilities`.
- Pagination defaults to `page=1&limit=20`, caps `limit` at 100, and uses deterministic secondary ordering by UUID.
- Contract changes require OpenAPI diff review, generated TypeScript client/types, regenerated Flutter models, backward-compatibility notes, and contract tests.

### Logs, metrics, audit, and Sentry

Operational logs are structured JSON in CloudWatch with at least: `timestamp`, `level`, `service`, `module`, `method`, `tenantId` when applicable, `actorId`, `correlationId`, `message`, relevant entity IDs, `durationMs`, `env`, and `appVersion`. Production defaults to `INFO`; `DEBUG` is time-limited and tenant-scoped; `TRACE` never ships.

Audit records are append-only and hash chained. Every mutation records actor, effective tenant, action, target, before/after or minimal diff, reason where applicable, correlation ID, source session/device, and timestamp. Audit storage is not replaced by CloudWatch or Sentry.

Sentry is configured separately for NestJS, React, Flutter, and Python Lambdas with release and environment identifiers. Each request or job is traceable across boundaries. Use stable low-cardinality tags such as `module`, `operation`, `tenantPlan`, `appVersion`, `queue`, and `platform`; do not tag raw tenant/user/entity IDs. IDs may be placed in scrubbed event context only when policy permits. Expected validation/domain errors are recorded as metrics or breadcrumbs, not noisy exception issues. `beforeSend`/event processors remove secrets and PII. Browser session replay stays disabled until masking is verified. Source maps and Flutter debug files upload from CI and are not publicly served. Each sprint defines alert thresholds and an owner/runbook.

The hosted targets are `fieldbrixxx/vite-react`, `fieldbrixxx/nest`, `fieldbrixxx/flutter` and `fieldbrixxx/lambdas`. Runtime/build variables are defined in [`../sentry/`](../sentry/); `SENTRY_AUTH_TOKEN` is CI-only. The dependency catalog and audit policy are in [`../react-libraries.md`](../react-libraries.md).

### LambdaTest qualification contract

“LambdaTest” below means the external cross-browser and real-device testing service, now documented under the TestMu AI name; “AWS Lambda” means serverless jobs and production synthetics.

- PR tier: local/unit/component checks and a compact Chromium/Android emulator smoke suite.
- Sprint QA tier: Playwright on current stable Chrome, Edge, Firefox, and Safari/WebKit at desktop widths; responsive web on current Android Chrome and iOS Safari real devices when the UI changes.
- Mobile tier: signed Android APK and iOS IPA uploaded to LambdaTest App Storage; Appium drives critical journeys on one low-memory Android, one current Samsung/Pixel-class Android, and one current iPhone. Location/camera/storage/offline behavior is included when relevant.
- Accessibility tier: changed web pages receive automated scans plus keyboard/screen-reader checks; changed native journeys receive LambdaTest accessibility automation where supported.
- Evidence: store LambdaTest build URL/ID, exact OS/browser/device versions, test commit SHA, videos/logs for failures, rerun outcome, and accepted exclusions.
- A sprint with no UI or device impact still includes a checked `Not applicable` assessment signed by QA; it never silently omits the gate.

### Test and CI gates

| Layer | Required gate |
|---|---|
| Static | TypeScript compile, ESLint zero warnings, dependency/secret scan, `flutter analyze`, Python lint/type checks where applicable |
| Unit | Services/repositories ≥80% line coverage; React hooks/components and Flutter providers/widgets cover behavior and failure states |
| Integration | Every endpoint: happy path + top three errors; real PostgreSQL/Testcontainers, RLS, S3/queue/email adapters or faithful emulators |
| Contract | OpenAPI validation, generated-client drift check, envelope/error schema, backward-compatibility diff |
| E2E | At least one HTTP → DB → response test per story; critical web/mobile journeys include UI → API → persistence |
| Security | Tenant probes, scope bypass, IDOR, rate limits, unsafe inputs/files, secret/PII redaction, dependency scan |
| Non-functional | Accessibility, supported browser/device matrix, performance budget, retry/load/chaos checks where applicable |
| Release | Migration up/down rehearsal, deploy smoke, Sentry release health, synthetics, backup/restore or rollback evidence |

## Dependency and milestone flow

```text
Foundation → App platform → Authentication → Dynamic RBAC + god mode
  → Administration → Master data → Workflow builder → Rules → Governance
  → Task lifecycle → Scheduling → Mobile alpha → Mobile execution → Offline hardening
  → Signature/review → Reporting/SMTP → Industry beta → Paid-pilot MVP
  → Portal → Contracts → Invoices → Tracking/feedback → Multi-site RC → Growth GA
```

Dependent work begins only after the prerequisite’s QA sign-off. Schema/API exploration may occur earlier behind a ticket, but mergeable production implementation may not bypass this gate.

## Global evidence register

| Evidence | Location/URL | Owner | Last verified | Status |
|---|---|---|---|---|
| CI required-check policy | TBD | Platform | — | NOT STARTED |
| OpenAPI published artifact | TBD | Backend | — | NOT STARTED |
| Generated Flutter model drift check | TBD | Mobile | — | NOT STARTED |
| CloudWatch dashboards and alarms | TBD | Platform | — | NOT STARTED |
| Sentry projects, releases, and alerts | `fieldbrixxx/{vite-react,nest,flutter,lambdas}` | Platform | [`../sentry/`](../sentry/) | NOT STARTED |
| Dependency/license/deprecation evidence | All application manifests and lockfiles | Engineering/Security | [`../react-libraries.md`](../react-libraries.md) | NOT STARTED |
| LambdaTest web matrix | TBD | QA | — | NOT STARTED |
| LambdaTest mobile matrix | TBD | QA | — | NOT STARTED |
| Security test reports | TBD | Security | — | NOT STARTED |
| Migration and rollback rehearsals | TBD | Backend/Platform | — | NOT STARTED |
| Release runbooks | TBD | Platform | — | NOT STARTED |

## Sources and decisions

- Product scope and capacity: [Sprint roadmap](../sprintplans/README.md)
- Original product journeys, field/rule catalogues, sector templates, acceptance failures and screen inventory: [`Configurable_Field_Service_MVP_Requirements.docx`](../docs/Configurable_Field_Service_MVP_Requirements.docx), reconciled through [product traceability](../sprintplans/TRACEABILITY.md)
- Original relational baseline and rationale: [`fieldbrix-schema.sql`](../docs/fieldbrix-schema.sql) and [`fieldbrix-schema-readme.md`](../docs/fieldbrix-schema-readme.md), evolved through the [technical migration ledger](TRACEABILITY.md#baseline-schema-migration-ledger)
- Architecture, API, logging, security, database, PR, and test rules: [Engineering handbook](../docs/ENGINEERING_HANDBOOK.md)
- Stack and implementation detail: [Technical implementation guide](../docs/tech_implementation_guide.md)
- Automated CI, emulator, synthetics, and device testing: [Automated testing strategy](../docs/AUTOMATED_TESTING_STRATEGY.md)
- Current Sentry SDK behavior was checked against official [NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs/), [React](https://docs.sentry.io/platforms/javascript/guides/react/), and [Flutter](https://docs.sentry.io/platforms/dart/guides/flutter/) documentation.
- npm dist-tags/deprecation and pub.dev metadata are checked live when an owning sprint begins; dated frontend results and all exceptions are recorded in [`react-libraries.md`](../react-libraries.md).
- LambdaTest/TestMu coverage is based on its current official [Playwright test-runner](https://www.testmuai.com/support/docs/playwright-test-runner/), [Appium real-device capabilities](https://www.testmuai.com/support/docs/desired-capabilities-in-appium/), and [native accessibility automation](https://www.testmuai.com/support/docs/accessibility-native-app-automation-test/) documentation.

When a sprint-specific file conflicts with the approved product scope, the roadmap wins. When it conflicts with a P0 engineering/security rule, the stricter rule wins and the discrepancy must be recorded as an architecture decision.
