# FieldBrix Terraform local setup

This guide matches the current SSM-managed, no-SSH production bootstrap. Run
commands from the Terraform repository root.

## Prerequisites

- AWS CLI v2 with IAM Identity Center support
- Terraform 1.15.8
- Bash, `jq`, and Python 3

Confirm the tools before continuing:

```bash
aws --version
terraform version
jq --version
python3 --version
```

## 1. Configure short-lived AWS access

Read `AWS_SENTRY_BOOTSTRAP.md` before the first infrastructure operation. Then
create the ignored local environment file and verify the expected account:

```bash
cp aws.env.example aws.env.local
source aws.env.local
./scripts/aws-login.sh
```

The helper must print account `059763918790`, Region `ap-south-1`, and an STS
assumed-role ARN. Do not proceed if any value differs. No permanent access key
or SSH key is required.

## 2. Validate without AWS or remote state

This check is safe to run before login and never reads the production state:

```bash
./scripts/validate.sh prod
```

It checks formatting, initializes providers in an isolated temporary directory,
and runs `terraform validate` with the backend disabled.

## 3. Bootstrap remote state once

Skip this step when the state bucket already exists:

```bash
source aws.env.local
./scripts/aws-login.sh
./scripts/bootstrap.sh
```

The production backend uses the encrypted, versioned S3 bucket declared in
`environments/prod/backend.tf` with native S3 state locking.

## 4. Create runtime secrets

Runtime values are prompted interactively and stored as encrypted Standard-tier
SSM SecureString parameters; they do not belong in Terraform variables or Git:

```bash
./scripts/secrets-init.sh prod
```

## 5. Configure non-secret inputs

```bash
cp environments/prod/terraform.tfvars.example \
  environments/prod/terraform.tfvars
```

Resolve the current Amazon Linux 2023 ARM64 AMI and replace only the placeholder
AMI in the ignored `terraform.tfvars` file:

```bash
aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 \
  --query Parameter.Value \
  --output text \
  --region ap-south-1 \
  --profile fieldbrix
```

Review domains, CORS origins, database class, engine version, and
`protect_database`. Keep deletion protection enabled once durable data exists.

## 6. Review and apply

Planning is read-only but requires the verified AWS session because it reads
remote state and provider data:

```bash
./scripts/plan.sh prod
```

Review every create, update, replace, and destroy action. Apply only the saved
plan after approval:

```bash
./scripts/apply.sh prod
```

Never use `terraform destroy` as an application rollback shortcut.

## 7. DNS, TLS, and application deployment

Read the static IP after apply, create the documented DNS A records in
Cloudflare, and wait for both names to resolve:

```bash
terraform -chdir=environments/prod output static_ip
./scripts/configure-tls.sh prod
./scripts/deploy-apps.sh prod
```

The deployment path is build/test → private S3 release object → Systems Manager
→ versioned EC2 release directory. It does not open SSH.

## 8. Verify and operate

```bash
./scripts/status.sh prod
curl --fail https://api.fieldbrix.com/health/live
curl --fail https://api.fieldbrix.com/health/ready
curl --fail https://api.fieldbrix.com/version
```

Use `./scripts/stop.sh prod` and `./scripts/start.sh prod` to preserve state while
controlling runtime cost. Use the previous immutable release for application
rollback; reverse infrastructure only through a separately reviewed plan.
