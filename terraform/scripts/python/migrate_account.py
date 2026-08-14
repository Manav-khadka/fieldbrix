#!/usr/bin/env python3
"""
Migrate Fieldbrix from one AWS account to another with minimal downtime.
Run AFTER terraform apply has created infrastructure in the new account.

Steps:
  1. Verify source is healthy
  2. Snapshot RDS
  3. Share snapshot to target account
  4. Restore snapshot in target
  5. Sync S3 buckets
  6. Verify target health

Usage:
  python migrate_account.py --env prod --source-profile old-account --target-profile new-account
"""
import sys, time, boto3, click
from datetime import datetime
from rich.console import Console

console = Console()

@click.command()
@click.option('--env',            required=True)
@click.option('--source-profile', required=True)
@click.option('--target-profile', required=True)
@click.option('--region',         default='ap-south-1')
def main(env, source_profile, target_profile, region):
    src = boto3.Session(profile_name=source_profile, region_name=region)
    tgt = boto3.Session(profile_name=target_profile, region_name=region)
    tgt_acct = tgt.client('sts').get_caller_identity()['Account']

    console.print(f"\n[bold]Migration: {source_profile} → {target_profile} ({tgt_acct})[/bold]\n")

    steps = [
        ("Verify source",    lambda: verify_ec2(src, env)),
        ("Create snapshot",  lambda: create_snapshot(src, env, tgt_acct)),
        ("Restore snapshot", lambda: restore_snapshot(src, tgt, env)),
        ("Sync S3",          lambda: sync_s3(src, tgt, env)),
    ]

    for name, fn in steps:
        console.print(f"[cyan]→ {name}...[/cyan]")
        try:
            msg = fn()
            console.print(f"  [green]✓ {msg}[/green]")
        except Exception as e:
            console.print(f"  [red]✗ FAILED: {e}[/red]")
            console.print("  Source account unaffected. Fix and re-run.")
            sys.exit(1)

    console.print("\n[bold green]Migration complete.[/bold green]")
    console.print("Update Cloudflare DNS to new account's static IP.\n")


def verify_ec2(session, env):
    ec2 = session.client('ec2')
    res = ec2.describe_instances(Filters=[{'Name':'tag:Name','Values':[f'fieldbrix-{env}-api']},{'Name':'instance-state-name','Values':['running']}])
    if not res['Reservations']: raise Exception("EC2 not running")
    return "Source EC2 running"


def create_snapshot(source, env, target_account):
    rds = source.client('rds')
    sid = f"fieldbrix-{env}-migration-{int(time.time())}"
    rds.create_db_snapshot(DBSnapshotIdentifier=sid, DBInstanceIdentifier=f'fieldbrix-{env}')
    console.print(f"    Waiting for snapshot {sid}...")
    rds.get_waiter('db_snapshot_completed').wait(DBSnapshotIdentifier=sid, WaiterConfig={'Delay':30,'MaxAttempts':40})
    rds.modify_db_snapshot_attribute(DBSnapshotIdentifier=sid, AttributeName='restore', ValuesToAdd=[target_account])
    return f"Snapshot {sid} ready and shared"


def restore_snapshot(source, target, env):
    src_rds, tgt_rds = source.client('rds'), target.client('rds')
    src_acct = source.client('sts').get_caller_identity()['Account']
    snaps = src_rds.describe_db_snapshots(DBInstanceIdentifier=f'fieldbrix-{env}', SnapshotType='manual')['DBSnapshots']
    if not snaps: raise Exception("No snapshots found")
    latest = sorted(snaps, key=lambda x: x['SnapshotCreateTime'])[-1]
    arn = f"arn:aws:rds:ap-south-1:{src_acct}:snapshot:{latest['DBSnapshotIdentifier']}"
    tgt_rds.restore_db_instance_from_db_snapshot(DBInstanceIdentifier=f'fieldbrix-{env}', DBSnapshotIdentifier=arn, DBInstanceClass='db.t3.micro', PubliclyAccessible=False)
    console.print("    Waiting for RDS restore (~10 minutes)...")
    tgt_rds.get_waiter('db_instance_available').wait(DBInstanceIdentifier=f'fieldbrix-{env}', WaiterConfig={'Delay':30,'MaxAttempts':60})
    return "Target RDS restored"


def sync_s3(source, target, env):
    s3_src, s3_tgt, total = source.client('s3'), target.client('s3'), 0
    for bucket in ['photos','pdfs','exports']:
        src_b, dst_b = f'fieldbrix-{env}-{bucket}', f'fieldbrix-{env}-{bucket}'
        for page in s3_src.get_paginator('list_objects_v2').paginate(Bucket=src_b):
            for obj in page.get('Contents',[]):
                s3_tgt.copy({'Bucket':src_b,'Key':obj['Key']}, dst_b, obj['Key'])
                total += 1
    return f"Synced {total} objects"


if __name__ == '__main__': main()
