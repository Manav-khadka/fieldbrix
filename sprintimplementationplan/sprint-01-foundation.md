# Sprint 01 — Repository and Infrastructure Foundation

Source: [Sprint plan](../sprintplans/sprint-01-foundation.md) · Prerequisite: none · Status: `IN PROGRESS` · Started: 2026-08-14 · Target: 64 points

## Outcome and boundaries

Deliver one-command local startup, reproducible CI, and production AWS infrastructure that can deploy, observe, back up, and roll back the FieldBrix shell. This sprint does not implement domain APIs, tenant data, or user journeys.

## Architecture and deliverables

- Target workspace: `apps/api`, `apps/web`, `mobile`, `lambdas/{pdf,scheduler,notifications,media}`, `packages/{types,schemas,config}`, `infra`, and `docs` with a single dependency lock and task graph.
- Local stack: PostgreSQL, LocalStack-compatible S3/SQS/DLQ, API/web shells, queue worker, deterministic seed, and health probes.
- Production IaC: VPC/private subnets, load balancer/EC2 where adopted, RDS PostgreSQL, S3 deployment artifacts, SQS/DLQ, IAM, KMS, Secrets Manager, CloudWatch, and backup/restore configuration. DNS remains with Cloudflare; AWS Certificate Manager, Route 53, CloudFront, and autoscaling are out of scope.
- CI artifacts: immutable application version/commit SHA, Terraform plan, test reports, SBOM, secret/dependency scan, and deploy manifest.

## Initial operational contracts

| Method | Path              | Purpose              | Contract and checks                                                                              |
| ------ | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/health/live`  | Process liveness     | `200` envelope; no dependency calls; <100 ms p95                                               |
| GET    | `/health/ready` | Deployment readiness | `200` only when DB, object storage, and queue adapters are usable; otherwise sanitized `503` |
| GET    | `/version`      | Release evidence     | commit SHA, semantic version, build time; no host/secrets                                        |

## Implementation checklist

### Repository and local developer experience

- [X] Record an ADR for repository layout, package boundaries, Node/Flutter/Python/Terraform versions, and ownership ([ADR-0001](../docs/adr/0001-repository-topology.md)).
- [X] Add shared TypeScript strict config, ESLint/Prettier, Flutter analysis, Python lint/type config, editor settings, and conventional commit validation.
- [X] Add commands for install, bootstrap, migrate, seed, test, lint, build, start, stop, and clean; commands are safe to rerun.
- [X] Pin container images and toolchains; generate/update lockfiles and document supported host prerequisites.
- [X] Add `.env` with names and descriptions; validate backend configuration at process startup.
- [X] Ensure local teardown targets only the named FieldBrix project volumes and never broad Docker/user data.
- [ ] Document <30-minute onboarding and verify it on a clean machine/account.

### Infrastructure and deployment

- [X] Separate Terraform state, modules, variables, outputs, and least-privilege deployment role; enable state locking/encryption.
- [ ] Keep RDS and workloads private; restrict ingress/egress; require TLS; encrypt RDS, buckets, queues, backups, and logs.
- [ ] Enable RDS automated backups/PITR, S3 versioning/lifecycle, SQS DLQ/redrive, load-balancer health checks where adopted, and termination protection where required.
- [ ] Put runtime secrets in Secrets Manager and grant resource-specific read access; rotate a test secret.
- [ ] Add a reversible deployment, database-independent app rollback, and release tagging.
- [ ] Create isolated production test-tenant configuration without granting it production customer data.
- [ ] Run `terraform fmt`, `validate`, policy/security scan, plan review, controlled apply, drift check, and destroy only in disposable CI infrastructure.

## Dependency and Sentry implementation

- Adopt the canonical [`react-libraries.md`](../react-libraries.md) statuses, latest-compatible-stable resolution record, frozen pnpm/pub lockfiles, weekly update review, approved open-source licenses and hard rejection of paid/premium frontend runtime packages.
- Create `fieldbrixxx/{vite-react,nest,flutter,lambdas}`; define runtime/build env keys, CI-only `SENTRY_AUTH_TOKEN`, matching release/environment identifiers, tested scrubbers, source-map/symbol upload and safe per-deploy test events. Record the verified `fieldbrix` AWS STS identity without ephemeral OIDC URLs.

## Code-principle gate

- [ ] SRP: repository tooling, local runtime, Terraform modules, deployment logic and health probes have one responsibility and owner.
- [ ] OCP: new services/environments extend task/IaC modules without rewriting stable bootstrap/deploy flows.
- [ ] LSP/ISP/DIP: local and AWS adapters satisfy the same focused ports/health contracts; application shells do not import provider SDKs directly.
- [ ] DRY/KISS/YAGNI: toolchain/config knowledge has one source; no speculative service, environment or abstraction enters this sprint.
- [ ] Fail Fast: invalid config, missing secret, failed dependency or unsafe Terraform plan stops readiness/deployment before side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logging, Sentry, metrics, and audit

| Signal  | Required implementation                                                                                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logs    | JSON startup/shutdown, config validation, dependency health, deployment and queue connectivity events with service/env/version/correlation ID; redact secrets and endpoints containing credentials |
| Metrics | readiness status, deploy duration/failure, DB connection health, queue depth/age, DLQ count, disk/CPU/memory, ALB 4xx/5xx and latency                                                              |
| Sentry  | Create API, web, Flutter, and Lambda projects; configure DSNs only through secrets; release/environment tagging; test event per deploy; source-map/debug-file upload plumbing                      |
| Alerts  | Readiness failure, sustained 5xx, RDS storage/connections, DLQ >0, backup failure, certificate expiry, deployment rollback                                                                         |
| Audit   | Infrastructure changes remain in Terraform/CloudTrail; business audit table is Sprint 02 scope                                                                                                     |

## Integration, test, and LambdaTest checklist

- [X] Unit-test config validators and health aggregation; Terraform helper validation remains in the offline validation script.
- [X] Integration-test API → PostgreSQL, API → S3 emulator, API → SQS/DLQ, web → API health, and worker receive/ack flows.
- [ ] Prove local bootstrap, migration placeholder, seed, restart, teardown, and second bootstrap on macOS and Linux CI.
- [ ] Rehearse Terraform plan/apply and deployment against a disposable account/stack; capture outputs without secrets.
- [ ] Restore a backup to an isolated database and verify connectivity and documented RTO/RPO evidence.
- [ ] Run IAM/TLS/encryption/public-access/secret scans and ensure no high/critical findings remain.
- [ ] LambdaTest web: open deployed web shell in Chrome, Edge, Firefox, Safari/WebKit at desktop and mobile widths; assert load, TLS, no console errors, and `/version` matches build.
- [ ] LambdaTest mobile: mark `N/A—no app journey yet`, signed by QA; verify only that future credentials are stored as CI secrets.
- [X] Inject failed DB, object-store, and queue dependencies; readiness becomes `503`, liveness stays healthy, and recovery is automatic. Production alarm firing remains an external AWS evidence item.

## Delivery and sign-off

- [ ] PRs are ≤400 changed lines where practical, use conventional commits, and receive required reviews; Terraform changes receive platform/security review.
- [ ] CI requires lint, typecheck, unit test, build, secret scan, dependency scan, IaC validation, artifact provenance, and preview plan.
- [ ] Deploy to production test surface, run smoke checks, verify Sentry release and CloudWatch dashboards, then execute rollback.
- [ ] Attach bootstrap transcript, Terraform plan/apply, backup restore, security report, LambdaTest build, Sentry test event, and rollback evidence.
- [ ] QA confirms every acceptance criterion in the source sprint and records sign-off before Sprint 02 starts.

Rollback: redeploy the prior immutable artifact and reverse only IaC changes proven safe by the reviewed plan. Never destroy stateful resources as a rollback shortcut.

## Sprint evidence log

| Date       | Slice                      | Evidence                                                                                                 | Result                                                                                                         |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 2026-08-14 | Repository contract        | [`ADR-0001`](../docs/adr/0001-repository-topology.md)                                                   | Accepted; Terraform remote registration remains open                                                           |
| 2026-08-14 | API operational contract   | Backend`/health/live`, `/health/ready`, and `/version`; CI workflow                                | lint, typecheck, 2 unit tests, 3 e2e tests, and build passed; readiness still needs storage and queue adapters |
| 2026-08-14 | Terraform queue foundation | Offline validation script, CI paths, encrypted SQS queues, DLQ redrive, least-privilege EC2 queue policy | `terraform fmt` and `terraform validate` passed without AWS/state access                                   |
| 2026-08-14 | CI/CD pipeline              | Backend/frontend CI, umbrella verification, Terraform plan/apply, and manually approved deployment | Local application builds, Terraform validation, Actionlint, and deployment-command rendering passed; mobile pipeline deferred |
| 2026-08-14 | Local runtime and health contracts | Pinned Compose stack, LocalStack S3/SQS, PostgreSQL, API config validator and dependency probes | Backend lint/typecheck, 4 unit tests, 4 E2E tests, build; frontend lint/typecheck/build; Flutter analyze/test; Docker Hub timed out fetching the Node base image before end-to-end compose startup |
| 2026-08-14 | Terraform retention and alerts | Retained/versioned buckets, lifecycle rollback retention, monitoring module, protected plan/apply workflow and read-only drift script | `terraform fmt` passed; offline module initialization completed. Direct remote-state access was denied (403) for this local AWS identity, so no cloud plan/apply was attempted |
| 2026-08-14 | Local integration and resilience | Clean Compose bootstrap, PostgreSQL, LocalStack S3/SQS, API/web health, queue worker receipt/ack, teardown/second bootstrap, dependency failure injection | API readiness passed against DB/S3/SQS; worker acknowledged a real queue message; DB and LocalStack failures produced `live=200` / `ready=503`, then recovered automatically |
