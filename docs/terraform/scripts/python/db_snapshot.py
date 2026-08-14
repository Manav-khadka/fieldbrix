#!/usr/bin/env python3
"""
Take an on-demand RDS snapshot before risky operations.
Always run before a major deploy or database migration.

Usage: python db_snapshot.py --env prod --reason before-v2-migration
"""
import boto3, click, time
from datetime import datetime
from rich.console import Console

console = Console()

@click.command()
@click.option('--env',    required=True)
@click.option('--reason', required=True)
@click.option('--region', default='ap-south-1')
@click.option('--profile',default=None)
def main(env, reason, region, profile):
    rds = boto3.Session(profile_name=profile, region_name=region).client('rds')
    ts  = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
    sid = f"fieldbrix-{env}-{reason}-{ts}"
    console.print(f"\n→ Creating snapshot: [bold]{sid}[/bold]")
    rds.create_db_snapshot(DBSnapshotIdentifier=sid, DBInstanceIdentifier=f'fieldbrix-{env}')
    console.print("  Waiting (5-10 minutes)...")
    rds.get_waiter('db_snapshot_completed').wait(DBSnapshotIdentifier=sid, WaiterConfig={'Delay':30,'MaxAttempts':40})
    snap = rds.describe_db_snapshots(DBSnapshotIdentifier=sid)['DBSnapshots'][0]
    console.print(f"\n[green]✓ Snapshot complete[/green]")
    console.print(f"  ID: {sid}")
    console.print(f"  Size: {snap.get('AllocatedStorage',0)} GB")
    console.print(f"  Status: {snap['Status']}\n")

if __name__ == '__main__': main()
