# scripts/

Operations scripts for managing the Fieldbrix infrastructure.

| Script | Purpose |
|--------|---------|
| `aws-login.sh` | Log in with AWS SSO when needed and verify the temporary STS identity |
| `bootstrap.sh` | One-time: create S3 + DynamoDB for Terraform state |
| `secrets-init.sh` | One-time: store all secrets in SSM Parameter Store |
| `plan.sh <env>` | Dry run — see what Terraform will change |
| `apply.sh <env>` | Apply the plan — create/update infrastructure |
| `stop.sh <env>` | Stop EC2 + RDS to save money while not working |
| `start.sh <env>` | Start EC2 + RDS back up (takes ~3 minutes) |
| `status.sh <env>` | Show what is running and current hourly cost |
| `ssh.sh <env>` | SSH into EC2 in one command |
| `db-tunnel.sh <env>` | Create SSH tunnel to RDS for local DB access |
| `destroy.sh <env>` | Delete everything (with confirmation prompt) |
| `python/` | Python scripts — health check, migration, cost report |

## Stop/Start to save money

The server does not need to run while you sleep.

```bash
./scripts/stop.sh prod    # before sleep — saves ~$14/month if done nightly + weekends
./scripts/start.sh prod   # next morning — takes ~3 minutes
./scripts/status.sh prod  # check what state everything is in
```

Your static IP (Elastic IP) stays the same. DNS does not break.
Data is fully preserved. RDS auto-restarts after 7 days if not manually started.
