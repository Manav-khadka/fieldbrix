#!/usr/bin/env python3
"""
Update a secret in SSM Parameter Store and reload the app gracefully.
Zero downtime — PM2 reloads with the new value.

Usage: python rotate_secret.py --env prod --secret jwt_secret --ec2-ip x.x.x.x
"""
import boto3, click, getpass, subprocess
from rich.console import Console

console = Console()
VALID = ['db_password','jwt_secret','jwt_refresh_secret','razorpay_key_secret',
         'msg91_auth_key','whatsapp_bsp_token','cloudflare_token',
         'grafana_loki_user_id','grafana_api_key','sentry_dsn']

@click.command()
@click.option('--env',    required=True)
@click.option('--secret', required=True, type=click.Choice(VALID))
@click.option('--ec2-ip', default=None, help='EC2 IP for app reload (get from status.sh)')
@click.option('--region', default='ap-south-1')
@click.option('--profile',default=None)
def main(env, secret, ec2_ip, region, profile):
    ssm  = boto3.Session(profile_name=profile, region_name=region).client('ssm')
    val  = getpass.getpass(f"New value for {secret}: ")
    if not val.strip(): console.print("[red]Empty value. Aborted.[/red]"); return
    ssm.put_parameter(Name=f'/fieldbrix/{env}/{secret}', Value=val, Type='SecureString', Overwrite=True)
    console.print(f"[green]✓ SSM updated: /fieldbrix/{env}/{secret}[/green]")
    if ec2_ip:
        r = subprocess.run(f"ssh -i ~/.ssh/fieldbrix_{env} -o StrictHostKeyChecking=no ec2-user@{ec2_ip} 'pm2 reload all --update-env'", shell=True, capture_output=True, text=True)
        if r.returncode == 0: console.print("[green]✓ App reloaded — new secret active[/green]")
        else: console.print(f"[yellow]Reload failed. Manually: pm2 reload all --update-env[/yellow]")
    else:
        console.print(f"[yellow]No EC2 IP — manually reload: ssh ... pm2 reload all --update-env[/yellow]")

if __name__ == '__main__': main()
