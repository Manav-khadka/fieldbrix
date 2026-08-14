# Backup and restore rehearsal

RDS automated backups provide a seven-day point-in-time recovery window. Before
a risky migration, create an on-demand snapshot with
`terraform/scripts/python/db_snapshot.py`. A restore is always made into a new,
isolated DB instance; never overwrite the production database to test restore.

## Rehearsal procedure

1. Create and wait for a named snapshot.
2. Restore it to an identifier beginning `fieldbrix-prod-restore-` in the same
   private subnet and security-group boundary.
3. Use an SSM port-forwarding session from an approved workstation to verify
   connectivity and the expected schema only. Do not copy production customer
   data to application environments.
4. Record snapshot ID, start/end timestamps, restore duration (RTO), and the
   latest recoverable timestamp (RPO) in the sprint evidence log.
5. Delete only the isolated restore instance after the evidence is captured.

The protected production RDS instance remains untouched throughout the
rehearsal. A deployment rollback uses `rollback-apps.sh` and never restores or
destroys the database.
