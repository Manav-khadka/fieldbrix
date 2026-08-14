# Sprint 01 — Repository and Infrastructure Foundation

Source: [Sprint plan](../sprintplans/sprint-01-foundation.md) · Prerequisite: none · Status: `NOT STARTED` · Target: 64 points

## Outcome and boundaries

Deliver one-command local startup, reproducible CI, and production AWS infrastructure that can deploy, observe, back up, and roll back the FieldBrix shell. This sprint does not implement domain APIs, tenant data, or user journeys.

## Architecture and deliverables

- Target workspace: `apps/api`, `apps/web`, `mobile`, `lambdas/{pdf,scheduler,notifications,media}`, `packages/{types,schemas,config}`, `infra`, and `docs` with a single dependency lock and task graph.
- Local stack: PostgreSQL, LocalStack-compatible S3/SQS/DLQ, API/web shells, queue worker, deterministic seed, and health probes.
- Production IaC: VPC/private subnets, load balancer/EC2, RDS PostgreSQL, S3/CloudFront, SQS/DLQ, IAM, KMS, Secrets Manager, Route 53/ACM, CloudWatch, backup and restore configuration.
- CI artifacts: immutable application version/commit SHA, Terraform plan, test reports, SBOM, secret/dependency scan, and deploy manifest.

## Initial operational contracts

| Method | Path | Purpose | Contract and checks |
|---|---|---|---|
| GET | `/health/live` | Process liveness | `200` envelope; no dependency calls; <100 ms p95 |
| GET | `/health/ready` | Deployment readiness | `200` only when DB, object storage, and queue adapters are usable; otherwise sanitized `503` |
| GET | `/version` | Release evidence | commit SHA, semantic version, build time; no host/secrets |

## Implementation checklist

### Repository and local developer experience

- [ ] Record an ADR for monorepo layout, package boundaries, Node/Flutter/Python versions, and ownership.
- [ ] Add shared TypeScript strict config, ESLint/Prettier, Flutter analysis, Python lint/type config, editor settings, and conventional commit validation.
- [ ] Add commands for install, bootstrap, migrate, seed, test, lint, build, start, stop, and clean; commands are safe to rerun.
- [ ] Pin container images and toolchains; generate/update lockfiles and document supported host prerequisites.
- [ ] Add `.env.example` with names and descriptions only; validate configuration at process startup.
- [ ] Ensure local teardown targets only the named FieldBrix project volumes and never broad Docker/user data.
- [ ] Document <30-minute onboarding and verify it on a clean machine/account.

### Infrastructure and deployment

- [ ] Separate Terraform state, modules, variables, outputs, and least-privilege deployment role; enable state locking/encryption.
- [ ] Keep RDS and workloads private; restrict ingress/egress; require TLS; encrypt RDS, buckets, queues, backups, and logs.
- [ ] Enable RDS automated backups/PITR, S3 versioning/lifecycle, SQS DLQ/redrive, ALB health checks, autoscaling and termination protection where required.
- [ ] Put runtime secrets in Secrets Manager and grant resource-specific read access; rotate a test secret.
- [ ] Add blue/green or equivalent reversible deployment, database-independent app rollback, CloudFront invalidation, and release tagging.
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

| Signal | Required implementation |
|---|---|
| Logs | JSON startup/shutdown, config validation, dependency health, deployment and queue connectivity events with service/env/version/correlation ID; redact secrets and endpoints containing credentials |
| Metrics | readiness status, deploy duration/failure, DB connection health, queue depth/age, DLQ count, disk/CPU/memory, ALB 4xx/5xx and latency |
| Sentry | Create API, web, Flutter, and Lambda projects; configure DSNs only through secrets; release/environment tagging; test event per deploy; source-map/debug-file upload plumbing |
| Alerts | Readiness failure, sustained 5xx, RDS storage/connections, DLQ >0, backup failure, certificate expiry, deployment rollback |
| Audit | Infrastructure changes remain in Terraform/CloudTrail; business audit table is Sprint 02 scope |

## Integration, test, and LambdaTest checklist

- [ ] Unit-test config validators, health aggregation, and Terraform helper logic.
- [ ] Integration-test API → PostgreSQL, API → S3 emulator, API → SQS/DLQ, web → API health, and worker receive/ack/fail flows.
- [ ] Prove local bootstrap, migration placeholder, seed, restart, teardown, and second bootstrap on macOS and Linux CI.
- [ ] Rehearse Terraform plan/apply and deployment against a disposable account/stack; capture outputs without secrets.
- [ ] Restore a backup to an isolated database and verify connectivity and documented RTO/RPO evidence.
- [ ] Run IAM/TLS/encryption/public-access/secret scans and ensure no high/critical findings remain.
- [ ] LambdaTest web: open deployed web shell in Chrome, Edge, Firefox, Safari/WebKit at desktop and mobile widths; assert load, TLS, no console errors, and `/version` matches build.
- [ ] LambdaTest mobile: mark `N/A—no app journey yet`, signed by QA; verify only that future credentials are stored as CI secrets.
- [ ] Inject failed DB, object-store, and queue dependencies; readiness becomes `503`, liveness stays healthy, alarms fire, and recovery is automatic.

## Delivery and sign-off

- [ ] PRs are ≤400 changed lines where practical, use conventional commits, and receive required reviews; Terraform changes receive platform/security review.
- [ ] CI requires lint, typecheck, unit test, build, secret scan, dependency scan, IaC validation, artifact provenance, and preview plan.
- [ ] Deploy to production test surface, run smoke checks, verify Sentry release and CloudWatch dashboards, then execute rollback.
- [ ] Attach bootstrap transcript, Terraform plan/apply, backup restore, security report, LambdaTest build, Sentry test event, and rollback evidence.
- [ ] QA confirms every acceptance criterion in the source sprint and records sign-off before Sprint 02 starts.

Rollback: redeploy the prior immutable artifact and reverse only IaC changes proven safe by the reviewed plan. Never destroy stateful resources as a rollback shortcut.
