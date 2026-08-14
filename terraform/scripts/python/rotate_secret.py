#!/usr/bin/env python3
"""Rotate a non-production-impacting encrypted SSM test parameter.

The database password is intentionally excluded: rotating it requires an RDS
credential migration, not a blind application restart. This command is the
Sprint 01 evidence path for safe Parameter Store rotation.

Usage: python rotate_secret.py --env prod --profile fieldbrix
"""
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
    client = boto3.Session(profile_name=profile, region_name=region).client('ssm')
    parameter_name = f'/fieldbrix/{env}/rotation_test_token'
    result = client.put_parameter(
        Name=parameter_name,
        Type='SecureString',
        Tier='Standard',
        Value=secrets.token_urlsafe(32),
        Overwrite=True,
    )
    console.print(
        f"[green]✓ Rotated test parameter {parameter_name} "
        f"(version {result['Version']})[/green]"
    )
    console.print('No parameter value was printed and no database credential changed.')

if __name__ == '__main__': main()
