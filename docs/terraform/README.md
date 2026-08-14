# Fieldbrix Infrastructure

> **New AWS account?** Start with `AWS_SENTRY_BOOTSTRAP.md` for secure AWS
> STS/SSO, Mac, budget, and Sentry setup. Then continue with `LOCAL_SETUP.md`.

Verified local AWS identity: profile `fieldbrix`, account `059763918790`, workload and SSO Region `ap-south-1`, access portal `https://d-9f6756e140.awsapps.com/start/`. Re-run `aws sts get-caller-identity --profile fieldbrix` before Terraform; the dated full STS evidence is in [`AWS_SENTRY_BOOTSTRAP.md`](AWS_SENTRY_BOOTSTRAP.md#verified-local-identity--14-august-2026).

---

## Quick commands

```bash
# First time setup
cp aws.env.example aws.env.local
source aws.env.local
./scripts/aws-login.sh          # log in with SSO + verify temporary STS identity
./scripts/bootstrap.sh          # create S3 + DynamoDB for Terraform state
./scripts/secrets-init.sh prod  # store all secrets in SSM (free, encrypted)
./scripts/plan.sh prod          # dry run — see what will be created
./scripts/apply.sh prod         # create everything (~8 minutes)

# Daily use — save money while sleeping
./scripts/stop.sh prod          # stop EC2 + RDS (~saves $14/month if done nightly)
./scripts/start.sh prod         # start everything back up (~3 minutes)
./scripts/status.sh prod        # see what's running and current cost

# Access
./scripts/ssh.sh prod           # SSH into EC2 in one command

# Verify
python scripts/python/health_check.py --env prod
```

---

## What this creates

```
AWS ap-south-1 (Mumbai)
├── EC2 t4g.medium              NestJS API + PgBouncer
│   └── Elastic IP (static)     Same IP forever — survives stop/start
├── RDS db.t3.micro             PostgreSQL 16 — managed backups
├── S3 (4 buckets)              photos, pdfs, exports, web SPA
├── SQS (4 queues + DLQ)        PDF, notifications, scheduler, media
├── CloudWatch                  Alarms at $50 and $90 spend
└── Cloudflare (free)           DNS + SSL + DDoS protection
```

## Monthly cost

| Running all month | Stopped 10hrs/night + weekends |
|-------------------|---------------------------------|
| ~$31/month        | ~$16/month                      |
| $100 credits ≈ 3.2 months | $100 credits ≈ 6.2 months |

## Folder map

```
environments/prod/   Where you run Terraform
modules/             Reusable building blocks (one per AWS service group)
scripts/             Bash + Python ops scripts
AWS_SENTRY_BOOTSTRAP.md Secure AWS account, STS/SSO, Mac, and Sentry setup
LOCAL_SETUP.md       Full setup guide from zero to running
```
