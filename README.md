# FieldBrix

This repository is the single repository for the FieldBrix platform.

## Integrated repositories

The platform applications live directly in this repository:

- Backend: `fieldbrix-backend/`
- Frontend: `fieldbrix-frontend/`
- Mobile: `fieldbrix_app/`
- Infrastructure: `terraform/`

## Local foundation (Sprint 01)

Prerequisites: Docker Desktop, Node 24, pnpm 10, Flutter 3.38+, Python 3.13,
and Terraform 1.15.  Copy `.env.example` to `.env` if you need to change host
ports; it contains development-only values and must not contain production secrets.

```bash
make install     # installs each repository's locked dependencies
make bootstrap   # starts the isolated fieldbrix compose project, migrates, seeds, and checks health
make test        # backend, web, mobile, and worker checks
make lint
make build
make stop        # stops containers but retains named data volumes
make clean       # removes only fieldbrix-named compose containers and volumes
```

`make bootstrap`, migration, and seed scripts are idempotent. The default local
PostgreSQL host port is `5433`, avoiding a common conflict with an existing
developer database. A successful readiness check verifies PostgreSQL, S3 and
SQS through LocalStack; liveness deliberately remains available when a
dependency is unavailable.

## Production safety

Terraform lives in [`terraform/`](terraform/README.md) with encrypted, locked
remote state. `terraform apply` is only available through the protected manual
workflow. Review a plan before applying it; do not use destroy as rollback.
Object buckets are retained and versioned, so application releases can be
reverted to a previous immutable artifact. Set `protect_database = true` before
putting durable data in production and confirm the configured alerts email.

The current compute topology is an EC2 bootstrap surface. Moving it behind an
ALB with private workloads is a production network migration and must be
reviewed and applied as its own change, not silently mixed into this sprint
foundation.

## Notes
- One umbrella commit contains the compatible backend, frontend, mobile, and
  infrastructure revisions. Application folders must not contain nested `.git`
  directories or be registered as submodules.
- Each application retains its own lockfile, while root CI/CD verifies all
  direct folders together.

See [`docs/adr/0001-repository-topology.md`](docs/adr/0001-repository-topology.md)
for the Sprint 01 repository contract.
