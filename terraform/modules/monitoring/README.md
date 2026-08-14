# modules/monitoring/

CloudWatch alarms and log groups. Sends email alerts on important events.

## Alarms created

| Alarm | Threshold | Action when triggered |
|-------|-----------|----------------------|
| `fieldbrix-billing-50usd` | AWS spend > $50 | Email alert — 25% of credits used |
| `fieldbrix-billing-90usd` | AWS spend > $90 | Email alert — credits nearly gone, add payment |
| `ec2-cpu-high` | CPU > 80% for 15min | Email — consider upgrading instance |
| `rds-connections` | >70 connections | Email — check PgBouncer is running |
| `rds-storage-low` | <2GB free | Email — expand RDS storage |

## Billing alarms must be in us-east-1

AWS billing metrics are only available in us-east-1 regardless of your app region.
This module creates a second AWS provider alias for that region automatically.

## Log groups

| Group | Retention | What it collects |
|-------|-----------|-----------------|
| `/fieldbrix/{env}/api` | 30 days | NestJS application logs via CloudWatch agent |
| `/fieldbrix/{env}/lambda/pdf` | 14 days | PDF generation Lambda logs |

Retention is set deliberately. Without it, logs accumulate forever and cost money.
