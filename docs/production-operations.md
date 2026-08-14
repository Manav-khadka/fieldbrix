# Production operations runbook

All FieldBrix workloads run in `ap-south-1` (Mumbai). AWS Billing metrics are
the sole exception: their alarms and notification topic must use `us-east-1`.
They contain no application data.

## Deploy

Use the authenticated `fieldbrix` AWS profile and the ignored root `.env`:

```bash
set -a; source .env; set +a
AWS_PROFILE=fieldbrix ./terraform/scripts/deploy-apps.sh prod
```

The script runs backend and frontend quality gates, creates immutable S3
artifacts, deploys through Systems Manager, then requires public HTTPS
readiness and `/version` to match the commit. It never prints runtime secrets.

## Roll back application files

List the immutable release directories through Systems Manager, choose a known
healthy release, then run:

```bash
AWS_PROFILE=fieldbrix ./terraform/scripts/rollback-apps.sh prod RELEASE_ID
```

This changes only the frontend/backend symlinks and service process. It does
not mutate or restore the database. The script polls live and ready health for
up to 30 seconds before reporting success.

## Restore rehearsal

Create a manual encrypted snapshot of `fieldbrix-prod`, restore it to a
uniquely named, non-public RDS instance in `fieldbrix-prod-subnet-group`, use
the existing application security group only, and verify it from the EC2 host
over TLS. Do not attach the restored database to the application service.

After recording the result, delete the temporary instance with
`--skip-final-snapshot`; retain the manual source snapshot only for the agreed
evidence-retention period. Never delete or restore the production instance as
an application rollback mechanism.

## Alerts and Sentry

SNS email subscriptions require recipient confirmation before delivery.
Sentry DSNs live only in encrypted Standard-tier SSM parameters and protected
CI/local environment files. Verify the safe deployment event in the Sentry
dashboard by release identifier; do not use production diagnostic endpoints.
