# FieldBrix AWS infrastructure

The production bootstrap stack runs in AWS account `059763918790`, Region
`ap-south-1`, using CLI profile `fieldbrix`. Verify the temporary SSO identity
before operating it:

```bash
aws sts get-caller-identity --profile fieldbrix
```

## Operate the stack

From the Terraform repository root:

```bash
./scripts/plan.sh prod          # validate and save a Terraform plan
./scripts/validate.sh prod      # offline-safe fmt/init/validate (no AWS access)
./scripts/apply.sh prod         # create or update infrastructure
./scripts/configure-tls.sh prod   # issue/repair TLS through SSM
./scripts/deploy-apps.sh prod   # build/test and deploy React + NestJS
./scripts/status.sh prod        # inspect EC2, Elastic IP, RDS, and S3
./scripts/stop.sh prod          # stop EC2 and RDS, preserving data and EIP
./scripts/start.sh prod         # start EC2 and RDS again
./scripts/destroy.sh prod       # deliberately remove the full disposable stack
```

The deployment path is local build/tests -> private S3 release objects -> AWS
Systems Manager -> versioned release directories on EC2. No SSH port or SSH key
is configured. PostgreSQL is private and accepts traffic only from the app
instance; the Nest readiness endpoint verifies it with TLS.

## DNS

Create these public DNS records using the current `static_ip` Terraform output:

| Type | Name | Value |
|---|---|---|
| A | `admin.fieldbrix.com` | `3.6.182.160` |
| A | `api.fieldbrix.com` | `3.6.182.160` |

Use TTL 300 while bootstrapping. Once both records resolve, run
`./scripts/configure-tls.sh prod` to issue and verify one Let's
Encrypt certificate for both names. The EIP survives stop/start but is released
by `terraform destroy`, so recheck the output after a future full recreation.

The certificate job runs twice daily with jitter and renews only when Certbot
reports the certificate as due. Current default Let's Encrypt certificates are
90 days, so renewal normally happens with roughly one-third of the lifetime
remaining—not on day 89. The job reloads nginx only after successful renewal and
reports a service failure if less than 14 days of certificate validity remains.

## Current bootstrap architecture

```text
Internet -> Elastic IP -> nginx HTTPS on EC2 t4g.small
                           |-- admin.fieldbrix.com -> React static files
                           `-- api.fieldbrix.com   -> NestJS :3000
                                                     `-> private RDS PostgreSQL 18.4

Private S3 -> release artifacts, photos, PDFs, and exports
SSM Parameter Store -> database credential
Systems Manager -> administrative and deployment commands
```

See `AWS_SENTRY_BOOTSTRAP.md` for the dated AWS identity evidence and
`environments/prod/README.md` for environment-specific outputs.
