# modules/compute/

EC2 instance, IAM role, SSH key pair, and Elastic IP (static IP).

## The static IP — why it matters

A regular EC2 public IP changes every time you stop and start the instance.
That would break your DNS and require you to update Cloudflare every morning.

The Elastic IP (EIP) is a static IP address that stays the same forever.
It is:
- Allocated to your AWS account permanently
- Automatically re-associated when EC2 starts after being stopped
- Free when EC2 is RUNNING
- Costs $0.005/hour (~$0.12/night) when EC2 is STOPPED

The EIP allocation and EC2 association are separate Terraform resources.
This means:
  - Stopping/starting EC2 does not affect the EIP allocation
  - You never need to update Cloudflare DNS after a stop/start
  - The IP survives even if you have to recreate the EC2

## Stop/start without losing your IP

```bash
./scripts/stop.sh prod   # EC2 stops, EIP stays allocated, costs $0.005/hr
./scripts/start.sh prod  # EC2 starts, EIP re-attaches, same IP as before
```

## PgBouncer (connection pooler — runs on this EC2)

NestJS connects to localhost:5432 → PgBouncer → RDS on real port 5432.
PgBouncer uses transaction pooling: multiplies effective RDS connections 5-10x.
RDS db.t3.micro supports 87 max connections. PgBouncer makes it feel like 200+.
PgBouncer uses ~30MB RAM and near-zero CPU. Installed via user_data on first boot.

## IMDSv2 (metadata_options http_tokens = required)

Prevents SSRF attacks from stealing EC2 role credentials via the metadata API.
Always enabled. This is a security best practice, not optional.
