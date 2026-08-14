# Sprint 2 — Application, Database, and API Platform

**Goal:** Establish the secure shared application architecture required by every feature.

**Prerequisite:** Sprint 1 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan database, API, storage, and queue tests | QA | 3 | Sprint 1 sign-off |
| Convert the approved SQL baseline into Prisma migrations with RLS | Backend/Database | 13 | Sprint 1 sign-off |
| Implement validation, errors, correlation IDs, logging, idempotency, and OpenAPI | Backend | 13 | Sprint 1 sign-off |
| Implement S3, SQS/DLQ, PDF-worker, health, and readiness adapters | Backend/DevOps | 8 | Sprint 1 sign-off |
| Functionally test migrations, APIs, files, queues, and health endpoints | QA | 5 | Implementations complete |
| Integration-test API–database–S3–SQS behavior | QA | 5 | Implementations complete |
| Regression-test scaffolds and CI gates | QA | 3 | Functional tests complete |
| Test RLS, uploads, encryption, and log redaction | Security/QA | 3 | Platform complete |
| Correct platform defects and re-test | Dev+QA | 8 | Test findings |
| Platform QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Re-resolve backend/schema/tooling dependencies as a compatible stable set; record deprecation, license, advisory and migration evidence while preserving frozen lockfiles.
- Implement early NestJS Sentry initialization for `fieldbrixxx/nest`, exception-filter integration, scrubbed HTTP/Prisma/S3/SQS traces, correlation propagation and tested unexpected-error alerts.

## Acceptance criteria

### Functional

- Ordered Prisma migrations create the approved schema and RLS policies.
- The original SQL baseline is reconciled, not copied blindly: UUIDv7 entity IDs, composite `(tenant_id, id)` keys/foreign keys, forced RLS, `citext`/search indexes, soft history, evidence metadata and trusted timestamps are preserved while fixed-role and OTP structures are prepared for their approved migrations.
- APIs use one success/error envelope, validate mutation idempotency, and emit correlation-aware structured logs.
- File and queue adapters expose successful and failed processing states.

### Test coverage required for sign-off

- Migration forward/rollback, missing tenant context, invalid idempotency, unsafe uploads, DLQ routing, health/readiness, and sensitive-log checks pass.
- Schema-diff tests cover extensions, constraints, partial/GIN/BRIN indexes, triggers, forced RLS and runtime-role UPDATE/DELETE denial for immutable records; entity UUIDv7 and mutation UUIDv4 policies are tested separately.
- Controller/service/database integration paths run in CI against disposable dependencies.
