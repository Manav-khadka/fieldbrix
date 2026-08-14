# modules/database/

RDS PostgreSQL 16 — managed, automated backups, encrypted.

## Password management

The DB password is supplied to protected CI as `PROD_DB_PASSWORD`, stored in
encrypted Standard-tier SSM Parameter Store, and read by the application using
resource-scoped IAM. Never place it in `terraform.tfvars`, code, or logs.

## Stop/start behaviour

When you run `./scripts/stop.sh`, RDS is stopped:
- Compute: $0/hour (saves ~$12/month if stopped nights + weekends)  
- Storage: still charged (~$2.30/month always)
- AWS LIMITATION: RDS auto-restarts after 7 days even if manually stopped

When you run `./scripts/start.sh`, RDS starts:
- Takes 2-3 minutes to be available
- Data is 100% preserved
- Endpoint URL does not change

## deletion_protection = true

Terraform will refuse to destroy RDS in prod even with `terraform destroy`.
You must set `deletion_protection = false` first and re-apply, then destroy.
This prevents accidental data loss. See
[`backup-restore.md`](../../docs/backup-restore.md) for the isolated restore
rehearsal procedure.
