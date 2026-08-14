#!/usr/bin/env python3
"""
Verify the full Fieldbrix stack is healthy.
Run after every terraform apply or start.sh.
Exit code 0 = healthy. Exit code 1 = something is wrong.

Usage:
    python health_check.py --env prod
    python health_check.py --env prod --profile fieldbrix
"""
import sys
import boto3
import click
from rich.console import Console
from rich.table import Table

console = Console()

REQUIRED_QUEUES = ['pdf-generation','notifications','scheduler','media-processing']


@click.command()
@click.option('--env',     required=True)
@click.option('--region',  default='ap-south-1')
@click.option('--profile', default=None)
def main(env, region, profile):
    session = boto3.Session(profile_name=profile, region_name=region)
    console.print(f"\n[bold]Fieldbrix Health Check — {env}[/bold]\n")

    checks = [
        ('EC2 instance',   *check_ec2(session, env)),
        ('RDS PostgreSQL', *check_rds(session, env)),
        ('Runtime secret', *check_runtime_secret(session, env)),
        ('SQS queues',     *check_sqs(session, env)),
        ('S3 buckets',     *check_s3(session, env)),
        ('Static IP',      *check_eip(session, env)),
    ]

    table = Table(show_header=True, header_style="bold")
    table.add_column("Check",  style="bold", width=20)
    table.add_column("Status", width=10)
    table.add_column("Details")

    all_ok = True
    for name, ok, msg in checks:
        status = "[green]✓ OK[/green]" if ok else "[red]✗ FAIL[/red]"
        table.add_row(name, status, msg)
        if not ok: all_ok = False

    console.print(table)
    if all_ok:
        console.print("\n[bold green]All checks passed. Stack is healthy.[/bold green]\n")
        sys.exit(0)
    else:
        console.print("\n[bold red]Some checks failed. See LOCAL_SETUP.md → Troubleshooting.[/bold red]\n")
        sys.exit(1)


def check_ec2(session, env):
    try:
        ec2 = session.client('ec2')
        res = ec2.describe_instances(Filters=[
            {'Name':'tag:Name','Values':[f'fieldbrix-{env}-api']},
            {'Name':'instance-state-name','Values':['running']},
        ])
        instances = [i for r in res['Reservations'] for i in r['Instances']]
        if instances:
            return True, f"Running — {instances[0].get('PublicIpAddress','no IP')}"
        return False, "Not running"
    except Exception as e: return False, str(e)


def check_rds(session, env):
    try:
        rds = session.client('rds')
        res = rds.describe_db_instances(DBInstanceIdentifier=f'fieldbrix-{env}')
        s   = res['DBInstances'][0]['DBInstanceStatus']
        ep  = res['DBInstances'][0]['Endpoint']['Address']
        return s == 'available', f"{s} — {ep}" if s == 'available' else s
    except Exception as e: return False, str(e)


def check_runtime_secret(session, env):
    try:
        secret = session.client('secretsmanager').describe_secret(
            SecretId=f'fieldbrix/{env}/runtime'
        )
        return True, f"Present — last changed {secret['LastChangedDate'].isoformat()}"
    except Exception as e: return False, str(e)


def check_sqs(session, env):
    try:
        sqs, found = session.client('sqs'), []
        for q in REQUIRED_QUEUES:
            suffix = '.fifo' if q != 'media-processing' else ''
            try:
                sqs.get_queue_url(QueueName=f'fieldbrix-{env}-{q}{suffix}')
                found.append(q)
            except Exception:
                pass
        total = len(REQUIRED_QUEUES)
        missing = set(REQUIRED_QUEUES) - set(found)
        if missing: return False, f"Missing: {', '.join(missing)}"
        return True, f"All {total} queues present"
    except Exception as e: return False, str(e)


def check_s3(session, env):
    try:
        s3, missing = session.client('s3'), []
        account_id = session.client('sts').get_caller_identity()['Account']
        for b in ['photos','pdfs','exports','web']:
            bucket = 'deployments' if b == 'web' else b
            try: s3.head_bucket(Bucket=f'fieldbrix-{env}-{account_id}-{bucket}')
            except: missing.append(b)
        if missing: return False, f"Missing: {', '.join(missing)}"
        return True, "All 4 buckets exist"
    except Exception as e: return False, str(e)


def check_eip(session, env):
    try:
        ec2 = session.client('ec2')
        res = ec2.describe_addresses(Filters=[{'Name':'tag:Name','Values':[f'fieldbrix-{env}-eip']}])
        if res['Addresses']:
            ip = res['Addresses'][0]['PublicIp']
            assoc = res['Addresses'][0].get('InstanceId','not associated')
            return True, f"{ip} ({'associated' if 'i-' in assoc else 'allocated but EC2 stopped'})"
        return False, "No Elastic IP found"
    except Exception as e: return False, str(e)


if __name__ == '__main__': main()
