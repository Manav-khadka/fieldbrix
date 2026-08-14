#!/usr/bin/env python3
"""
Show AWS spend and estimate remaining credit runway.
Run weekly to stay on top of your $200 credit balance.

Usage: python cost_report.py --credits 200
"""
import boto3, click
from datetime import datetime
from rich.console import Console
from rich.table import Table

console = Console()

@click.command()
@click.option('--credits', default=200.0, help='Starting credits (default: 200)')
@click.option('--profile', default=None)
def main(credits, profile):
    cw  = boto3.Session(profile_name=profile, region_name='us-east-1').client('cloudwatch')
    end = datetime.utcnow()
    start = end.replace(day=1, hour=0, minute=0, second=0)
    res = cw.get_metric_statistics(
        Namespace='AWS/Billing', MetricName='EstimatedCharges',
        Dimensions=[{'Name':'Currency','Value':'USD'}],
        StartTime=start, EndTime=end, Period=86400, Statistics=['Maximum']
    )
    if not res['Datapoints']:
        console.print("[yellow]No billing data. Enable billing alerts in AWS Console → Billing → Preferences.[/yellow]")
        return

    latest      = sorted(res['Datapoints'], key=lambda x: x['Timestamp'])[-1]
    spent       = latest['Maximum']
    days        = max((end - start).days, 1)
    daily       = spent / days
    est_month   = daily * 30
    remaining   = credits - spent
    runway_days = remaining / daily if daily > 0 else 9999

    table = Table(title=f"AWS Cost Report — {end.strftime('%B %Y')}", show_header=False)
    table.add_column("", style="bold", width=28)
    table.add_column("", justify="right")
    table.add_row("Spent this month",   f"${spent:.2f}")
    table.add_row("Daily burn rate",    f"${daily:.2f}/day")
    table.add_row("Estimated month",    f"${est_month:.2f}")
    table.add_row("", "")
    table.add_row("Credits remaining",  f"[green]${remaining:.2f}[/green]")
    table.add_row("Runway",             f"[green]{runway_days/30:.1f} months[/green]")
    table.add_row("", "")
    table.add_row("Budget target",      "$31.27/month (always on)")
    table.add_row("Budget (nightly stop)", "$22/month")
    table.add_row("Budget (nights+weekends)", "$16/month")

    console.print(table)
    if remaining < 50:
        console.print("[bold red]WARNING: < $50 remaining. Add a payment method now.[/bold red]")

if __name__ == '__main__': main()
