# Sprint 02 — Application, Database, and API Platform

Source: [Sprint plan](../sprintplans/sprint-02-application-platform.md) · Prerequisite: Sprint 01 QA sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and boundaries

Create the shared NestJS/Prisma platform that every feature inherits: schema migrations and RLS, response/error contracts, validation, idempotency, correlation, file/queue adapters, OpenAPI, audit foundation, and observable worker jobs.

## Data and architecture

- Implement Controller → Service → Repository → Prisma boundaries and shared modules for config, database, tenant context placeholder, idempotency, audit, logger, errors, storage, queue, health, and OpenAPI.
- Convert the approved SQL baseline into ordered, reversible Prisma/SQL migrations. Preserve extensions, constraints, generated fields, partial indexes, triggers, RLS and FORCE RLS that Prisma cannot express.
- Use UUIDv7 for application/entity identities and client UUIDv4 for idempotency/mutation keys. Preserve composite `(tenant_id,id)` primary/foreign keys, `citext`, `pg_trgm`/`btree_gin`, trusted `timestamptz`/`clock_timestamp()` behavior, soft deletes and GIN/BRIN/partial indexes.
- Treat fixed `membership_role`/`permission_overrides` and OTP tables/enums as versioned baseline deltas owned by Sprints 04 and 03/08/15; do not expose them as final active contracts.
- Add `idempotency_records`, append-only/hash-linked `audit_logs`, and outbox/job metadata if absent; indexes include tenant plus lookup/order columns.
- Repository transactions set `app.tenant_id`; platform-context access remains unavailable until Sprint 04.

## API and async contracts

| Method | Path | Permission | Request/result | Errors |
|---|---|---|---|---|
| GET | `/health/live` | Public | Standard envelope with process status | `500` startup fault |
| GET | `/health/ready` | Public | DB/S3/SQS readiness summary without credentials | `503 DEPENDENCY_UNAVAILABLE` |
| GET | `/version` | Public | version, SHA, build time | `500 INTERNAL_ERROR` |
| POST | `/files/upload-intents` | Auth placeholder | MIME, size, checksum, idempotency key → upload ID/presigned request | `400`, `413`, `415`, `422` |
| POST | `/files/:uploadId/complete` | Auth placeholder | checksum/metadata/idempotency → stored file metadata | `404`, `409`, `422` |
| GET | `/openapi.json` | Controlled by environment | Versioned OpenAPI 3 contract | `404` when disabled |

Queue envelope: `{eventId,eventType,eventVersion,occurredAt,tenantId,actorId,correlationId,idempotencyKey,payload}`. Consumers validate version, process once, record attempt/error, and route exhausted jobs to DLQ.

## Implementation checklist

### Backend, database, and contracts

- [ ] Register global validation, response transform, correlation middleware, domain-exception filter, rate limit, and audit interceptor in deterministic order.
- [ ] Implement success/list/error envelopes exactly; add typed error catalogue and forbid `204`.
- [ ] Implement client UUID-v4 idempotency validation, request fingerprinting, atomic result cache, concurrency lock, replay contract, retention, and mismatch rejection.
- [ ] Add Prisma extension/repository guard requiring tenant context and tenant filters; test raw query restrictions.
- [ ] Implement S3 adapter with allowlisted MIME, server-side detection, max size, checksum, namespaced keys, encryption and presigned expiry.
- [ ] Implement SQS publisher/consumer with schema validation, exponential retry, visibility timeout, poison-message handling, DLQ redrive metadata and correlation propagation.
- [ ] Create PDF-worker contract stub, health/readiness adapters, graceful shutdown and connection draining.
- [ ] Generate OpenAPI and TypeScript/Flutter model artifacts; CI fails on uncommitted drift.
- [ ] Pair every up migration with down guidance; test empty, seeded, rollback, and reapply paths.
- [ ] Create a baseline-to-target migration ledger covering all 46 tables and every new auth/RBAC/god/SMTP/Growth table; no Prisma introspection silently drops SQL-only constraints or policies.
- [ ] Create runtime/migration/read-only DB roles and deny runtime UPDATE/DELETE on published workflow versions, submitted runs/evidence, generated reports and audit rows as those tables become active.

## Dependency and Sentry implementation

- Resolve backend/Prisma/schema tooling as one compatible stable set and record version/dist-tag, deprecation, license, advisory, peer/runtime and migration evidence; manifests/lockfiles, not prose majors, define the build.
- Initialize `@sentry/nestjs` before application imports for `fieldbrixxx/nest`; integrate exactly one global exception capture path, scrub HTTP/Prisma/S3/SQS data, propagate correlation/release/environment and test new-error/error-rate alerts.

## Code-principle gate

- [ ] SRP: controllers, use-case services, repositories, guards/interceptors and storage/queue adapters remain separate.
- [ ] OCP: errors, event handlers and adapters extend typed registries/contracts instead of growing central switches.
- [ ] LSP/ISP/DIP: S3/local storage and SQS/local queue implementations pass shared focused-port contract tests; domain code owns the ports.
- [ ] DRY/KISS/YAGNI: envelopes, error codes, idempotency and audit rules have one source; no deferred feature framework is introduced.
- [ ] Fail Fast: DTO/config/schema/version/tenant checks run before database, file or queue side effects and leave no partial state.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logging, Sentry, metrics, and audit

| Signal | Required implementation |
|---|---|
| Logs | `http_request_completed`, `domain_error`, `unexpected_error`, `idempotency_replay`, `file_upload_*`, `queue_publish`, `queue_consume`, `queue_dlq`; include method/route/status/duration and safe IDs |
| Metrics | request rate/error/latency by normalized route, validation/domain error counts, DB query latency/pool, uploads/bytes/failures, queue publish/consume/retry/age/DLQ |
| Sentry | NestJS initialization before application imports; exception filter integration; HTTP/Prisma/SQS/S3 spans; scrubber; release marker; issue alert for new unhandled errors and error-rate threshold |
| Audit | Mutation interceptor contract plus hash-chain verification job; actor/tenant can be system placeholders until auth exists; operational logs never substitute |

## Integration, test, and LambdaTest checklist

- [ ] Unit-test envelopes, error mapping, validators, idempotency concurrency, file rules, queue retry, audit hashing, and tenant-context guard to ≥80%.
- [ ] For every endpoint test happy path plus malformed input, unavailable dependency, and unsafe/cross-context attempt.
- [ ] E2E-test HTTP → interceptor → service → repository → PostgreSQL envelope and request/correlation headers.
- [ ] Run migrations from empty DB, approved baseline, and rollback fixture; compare constraints/indexes/RLS to SQL source.
- [ ] Schema-diff test UUID policies, all composite tenant FKs, `citext` uniqueness, trigram/GIN/BRIN/partial indexes, updated-at triggers, RLS/FORCE RLS and missing-context fail-closed behavior.
- [ ] Attempt missing tenant context, tenant override, RLS-disabled connection, raw SQL injection, large/wrong-MIME upload, checksum mismatch, replay 10x, and poison queue message.
- [ ] Verify no body/secrets/presigned URLs appear in logs or Sentry; deliberately raise a test exception and trace it across API and worker.
- [ ] LambdaTest web: shell plus API failure/error-boundary smoke on the Sprint 01 browser matrix; validate correlation ID visible to support UI if rendered.
- [ ] LambdaTest mobile: `N/A—no product app flow`; QA records assessment.
- [ ] Performance baseline: health p95 <100 ms, simple DB endpoint p95 target documented, 100 concurrent idempotent mutations create exactly one result.

## Delivery and sign-off

- [ ] Publish versioned OpenAPI, error catalogue, queue schema, migration inventory, log field dictionary, dashboards and runbooks.
- [ ] CI gates lint/type/unit/integration/E2E, migration up/down, OpenAPI drift, Prisma tenant lint, image/file scan, secret/dependency scan, and production build.
- [ ] Deploy, verify readiness, submit/replay a test mutation, process a test queue job, exercise DLQ alarm, and roll back app plus reversible migration.
- [ ] Attach API examples, test reports, migration checks, Sentry trace, CloudWatch dashboard and LambdaTest evidence.
- [ ] Platform QA sign-off blocks Sprint 03.
