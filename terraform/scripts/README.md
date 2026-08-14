# scripts/

Operations scripts for managing the Fieldbrix infrastructure.

| Script | Purpose |
|--------|---------|
| `aws-login.sh` | Log in with AWS SSO when needed and verify the temporary STS identity |
| `bootstrap.sh` | One-time: create versioned encrypted S3 state storage with native S3 locking |
| `secrets-init.sh` | Create or update encrypted Standard-tier SSM runtime parameters |
| `plan.sh <env>` | Dry run — see what Terraform will change |
| `apply.sh <env>` | Apply the plan — create/update infrastructure |
| `deploy-apps.sh <env>` | Build, test, upload, and activate the React + NestJS release through S3 and SSM |
| `rollback-apps.sh <env> <release-id>` | Re-activate a prior immutable application release without changing the database |
| `configure-tls.sh <env> [email]` | Issue/repair Let's Encrypt certificates and install the twice-daily renewal timer through SSM |
| `stop.sh <env>` | Stop EC2 + RDS to save money while not working |
| `start.sh <env>` | Start EC2 + RDS back up (takes ~3 minutes) |
| `status.sh <env>` | Show what is running and current hourly cost |
| `destroy.sh <env>` | Delete everything (with confirmation prompt) |
| `python/` | Python scripts — health check, migration, cost report |

## Stop/Start to save money

The server does not need to run while you sleep.

```bash
./scripts/stop.sh prod    # before sleep — saves ~$14/month if done nightly + weekends
./scripts/start.sh prod   # next morning — takes ~3 minutes
./scripts/status.sh prod  # check what state everything is in
```

Your static IP (Elastic IP) stays the same while the stack is stopped. A full
`terraform destroy` releases the address, so a later recreation can require DNS
updates.
Data is fully preserved. RDS auto-restarts after 7 days if not manually started.

## Restore rehearsal

Follow [`../docs/backup-restore.md`](../docs/backup-restore.md). Restore only
into a new isolated DB instance; production rollback never destroys or restores
the production database.

## TLS certificates

After both public DNS A records resolve to the Terraform `static_ip`, run:

```bash
./scripts/configure-tls.sh prod
```

The optional email argument is accepted for Certbot compatibility, but Let's
Encrypt no longer sends expiration emails. This issues one certificate covering
the admin and API hostnames, redirects HTTP
to HTTPS, and installs `fieldbrix-tls.timer`. The timer checks twice daily with
up to one hour of jitter. Certbot renews only inside the CA/client renewal window
and reloads nginx after a successful renewal; the maintenance service fails and
logs a critical message if fewer than 14 days remain.
