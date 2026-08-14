# Sprint 01 developer onboarding

Target time: under 30 minutes on a supported macOS or Linux machine with a
working Docker installation and a normal broadband connection.

## Prerequisites

- Docker Desktop or Docker Engine with Compose v2
- Node.js 24, pnpm 10.29.3, Flutter 3.38+, Python 3.13, and Terraform 1.15
- Git and `make`

No AWS credential, production secret, Sentry DSN, or mobile device is needed
for the local foundation.

## First run

```bash
git clone https://github.com/Manav-khadka/fieldbrix.git
cd fieldbrix
cp .env.example .env # optional; defaults are development-only
make bootstrap
```

`make bootstrap` installs frozen dependencies, builds and starts the isolated
Compose project, runs the repeatable migration and seed steps, then verifies
API/web/PostgreSQL/S3/SQS health. It is safe to rerun.

## Verify and clean up

```bash
make lint
make test
make build
make stop  # retain local volumes
make clean # remove only FieldBrix containers and volumes
```

Clean-machine evidence is supplied by the GitHub Actions `integration` job:
every run starts from a fresh hosted Linux checkout, builds the stack, runs
migrate/seed/health, proves queue acknowledgement and dependency recovery, and
performs bounded teardown. The latest verified run is recorded in the Sprint
01 evidence log.
