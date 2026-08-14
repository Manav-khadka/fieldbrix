# FieldBrix GitHub Actions

## Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Pull requests and pushes to `main` | Runs backend, frontend, and Terraform checks in one job |
| `terraform-plan.yml` | Pull requests changing `terraform/` | Runs offline validation and a production plan |
| `terraform-apply.yml` | Manual dispatch with confirmation | Re-plans and applies through the protected production environment |
| `deploy.yml` | Manual dispatch with confirmation | Builds the direct application folders, deploys a versioned release, and runs smoke checks |
| `security.yml` | Pull requests, `main`, and weekly | Blocks committed secrets and high/critical dependency or IaC findings; publishes an SBOM |

`ci.yml` also runs the Linux Docker integration stack: PostgreSQL, LocalStack
S3/SQS, API readiness, web health, worker receive/ack, and database recovery.

The root repository owns CI/CD for the direct application folders.

## Required repository configuration

Create a GitHub environment named `production` with required reviewers and
deployment-branch protection for `main`. Configure these Actions secrets:

| Secret | Used by |
|---|---|
| `AWS_TERRAFORM_ROLE_ARN` | Repository secret; Terraform plan/apply through GitHub OIDC |
| `PROD_AMI_ID` | Repository secret; non-secret AMI input written to the ignored CI tfvars file |
| `PROD_DB_PASSWORD` | Repository secret; RDS password written only to the ephemeral CI tfvars file |
| `PROD_BACKEND_SENTRY_DSN` | Repository secret; written only to the KMS-encrypted runtime secret during Terraform apply |
| `PROD_WEB_SENTRY_DSN` | Repository secret; injected into the Vite build, never into server runtime state |
| `SENTRY_AUTH_TOKEN` | `production` environment secret; optional source-map upload token, never exposed to app runtime |
| `AWS_DEPLOY_ROLE_ARN` | `production` environment secret; S3 upload, SSM deployment, and read-only Terraform outputs |

The IAM roles must trust this repository's GitHub OIDC subject and use
short-lived STS sessions. Do not create GitHub secrets for permanent AWS access
keys. The deployment role needs only the release bucket, target SSM instance,
SSM command APIs, and read access to the Terraform state/outputs required by the
deployment script.

If Sentry source-map upload is enabled, set `SENTRY_ORG`,
`SENTRY_WEB_PROJECT`, and `SENTRY_BACKEND_PROJECT` as production environment
variables. The deploy script skips Sentry upload when `SENTRY_AUTH_TOKEN` is
not configured.

Protect `main` and require this umbrella check before merge:

- `verify`
- `Security / scan`
- `Terraform Plan` when infrastructure changes

Terraform apply and application deployment share the `production` concurrency
boundary indirectly through environment approval; do not approve both at the
same time.

Mobile CI/CD is intentionally deferred for Sprint 01. The mobile source is
tracked directly in the root repository, but no mobile workflow or required
check runs.
# CI/CD configuration

Production Terraform workflows require `AWS_TERRAFORM_ROLE_ARN`, `PROD_AMI_ID`,
and `PROD_ALERT_EMAIL`. Application deployment additionally requires
`AWS_DEPLOY_ROLE_ARN`. Configure them as repository or environment secrets;
never store them in Terraform variables or `.env` files.

Mobile CI is intentionally out of scope for Sprint 01.
