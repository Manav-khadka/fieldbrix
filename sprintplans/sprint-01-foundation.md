# Sprint 1 — Repository and Infrastructure Foundation

**Goal:** Produce a reproducible local platform and deployable production foundation.

**Prerequisite:** None  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Define infrastructure and repository acceptance scenarios | QA/Platform | 3 | None |
| Establish monorepo structure, shared configs, schemas, and build orchestration | Platform | 13 | None |
| Build local PostgreSQL, API, web, queue, storage, and sync environment | DevOps/Backend | 13 | None |
| Build production networking, EC2, RDS, S3, SQS/DLQ, DNS/CDN, monitoring, and secrets IaC | DevOps | 8 | None |
| Test local bootstrap, teardown, migrations, and health checks | QA | 5 | Local environment complete |
| Test Terraform plan/apply, connectivity, backups, and deployment | QA/DevOps | 5 | Production IaC complete |
| Regression-test application builds and CI gates | QA | 3 | Repository setup complete |
| Check IAM, TLS, encryption, backups, alarms, and secrets | Security/QA | 3 | Infrastructure available |
| Correct foundation defects and repeat failed checks | Dev+QA | 8 | Test findings |
| Infrastructure QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Establish the [`react-libraries.md`](../react-libraries.md) latest-compatible-stable, frozen-lockfile, open-source-license and no-paid/premium UI policy; configure weekly dependency-update review without auto-merging majors/prereleases.
- Create `fieldbrixxx/{vite-react,nest,flutter,lambdas}`, env-only DSNs, CI-only upload token, release/environment identifiers, scrubbers, source-map/symbol plumbing and one safe test event per deploy. Attach the verified AWS `fieldbrix` STS identity evidence.

## Acceptance criteria

### Functional

- One documented command starts all required local dependencies.
- Backend, web, and mobile projects build from the documented repository workflow.
- Production IaC supports deployment, health checks, encrypted storage, backups, monitoring, and rollback.

### Test coverage required for sign-off

- Terraform validation and production plan pass without unmanaged secrets.
- Local smoke suite and application build matrix pass.
- Backup/restore, least-privilege IAM, TLS, secret scanning, cost alarms, and rollback are evidenced.
