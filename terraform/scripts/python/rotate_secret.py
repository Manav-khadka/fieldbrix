#!/usr/bin/env python3
"""Rotate the non-production-impacting runtime test secret in Secrets Manager.

The database password is intentionally excluded: rotating it requires an RDS
credential migration, not a blind application restart. This command is the
Sprint 01 evidence path for safe Secrets Manager rotation.

Usage: python rotate_secret.py --env prod --profile fieldbrix
"""
import json
import secrets

import boto3
import click
from rich.console import Console

console = Console()

@click.command()
@click.option('--env', required=True)
@click.option('--region', default='ap-south-1')
@click.option('--profile', default=None)
def main(env, region, profile):
    client = boto3.Session(profile_name=profile, region_name=region).client(
        'secretsmanager'
    )
    secret_id = f'fieldbrix/{env}/runtime'
    current = client.get_secret_value(SecretId=secret_id)['SecretString']
    values = json.loads(current)
    values['ROTATION_TEST_TOKEN'] = secrets.token_urlsafe(32)
    result = client.put_secret_value(
        SecretId=secret_id,
        SecretString=json.dumps(values, separators=(',', ':')),
    )
    console.print(
        f"[green]✓ Rotated non-runtime test value in {secret_id} "
        f"(version {result['VersionId']})[/green]"
    )
    console.print('No secret value was printed and no database credential changed.')

if __name__ == '__main__': main()
