# FieldBrix GitHub Actions

## Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Pull requests and pushes to `main` | Runs backend, frontend, and Terraform checks in one job |
| `terraform-plan.yml` | Pull requests changing `terraform/` | Runs offline validation and a production plan |
| `terraform-apply.yml` | Manual dispatch with confirmation | Re-plans and applies through the protected production environment |
| `deploy.yml` | Manual dispatch with confirmation | Builds pinned apps, deploys a versioned release, and runs smoke checks |

Application repositories also own their focused CI workflows. Their successful
commits are pinned in this umbrella repository before integration or deployment.

## Required repository configuration

Create a GitHub environment named `production` with required reviewers and
deployment-branch protection for `main`. Configure these Actions secrets:

| Secret | Used by |
|---|---|
| `AWS_TERRAFORM_ROLE_ARN` | Repository secret; Terraform plan/apply through GitHub OIDC |
| `PROD_AMI_ID` | Repository secret; non-secret AMI input written to the ignored CI tfvars file |
| `SUBMODULES_TOKEN` | Repository secret; fine-grained read-only token for the private application repositories |
| `AWS_DEPLOY_ROLE_ARN` | `production` environment secret; S3 upload, SSM deployment, and read-only Terraform outputs |

The IAM roles must trust this repository's GitHub OIDC subject and use
short-lived STS sessions. Do not create GitHub secrets for permanent AWS access
keys. The deployment role needs only the release bucket, target SSM instance,
SSM command APIs, and read access to the Terraform state/outputs required by the
deployment script.

`SUBMODULES_TOKEN` must have read-only Contents permission and access only to
`fieldbrix-backend`, `fieldbrix-frontend`, and `fieldbrix-mobile`. GitHub's
default repository token cannot clone sibling private repositories.

Protect `main` and require this umbrella check before merge:

- `verify`
- `Terraform Plan` when infrastructure changes

Terraform apply and application deployment share the `production` concurrency
boundary indirectly through environment approval; do not approve both at the
same time.

Mobile CI/CD is intentionally deferred for Sprint 01. The mobile source remains
available as a pinned submodule, but no mobile workflow or required check runs.
