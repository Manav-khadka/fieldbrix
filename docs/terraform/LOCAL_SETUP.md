# Fieldbrix — Local Setup Guide
### From zero to a running stack, step by step

---

## What you need before starting

Install these on your local machine:

```bash
# 1. AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install
aws --version   # should show aws-cli/2.x.x

# macOS:
brew install awscli

# 2. Terraform 1.7+
brew install terraform          # macOS
# Linux: https://developer.hashicorp.com/terraform/install

# 3. Python 3.11+ (for ops scripts)
python3 --version

# 4. jq (for parsing AWS CLI output)
brew install jq                 # macOS
sudo apt-get install jq         # Linux
```

---

## Step 1 — AWS account setup

Complete `AWS_SENTRY_BOOTSTRAP.md` first. It covers root MFA, budget alerts,
IAM Identity Center, Sentry, and local AWS CLI setup.

For daily local use, this project uses IAM Identity Center and temporary AWS
STS credentials. It does not require a permanent IAM-user access key.

The configured target is profile `fieldbrix`, account `059763918790`, portal `https://d-9f6756e140.awsapps.com/start/`, permission set `FieldbrixAdministrator`, and workload/SSO Region `ap-south-1`. Verify it before any plan or apply:

```bash
aws sts get-caller-identity --profile fieldbrix
```

The expected full identity pattern and the successful 14 August 2026 result are recorded in [`AWS_SENTRY_BOOTSTRAP.md`](AWS_SENTRY_BOOTSTRAP.md#verified-local-identity--14-august-2026). Never copy the one-time browser authorization URL into documentation.

```bash
cp aws.env.example aws.env.local
source aws.env.local
./scripts/aws-login.sh
```

Do not continue unless the printed account ID is correct and the caller ARN is
an `arn:aws:sts::...:assumed-role/...` ARN.

---

## Step 2 — Generate SSH key

This is how you SSH into your EC2 server. Keep the private key safe.

```bash
# Generate a new key pair specifically for Fieldbrix
ssh-keygen -t ed25519 -C "fieldbrix-prod" -f ~/.ssh/fieldbrix_prod

# This creates:
# ~/.ssh/fieldbrix_prod      ← PRIVATE key (never share this)
# ~/.ssh/fieldbrix_prod.pub  ← PUBLIC key (this goes into Terraform)

# Verify
cat ~/.ssh/fieldbrix_prod.pub
# Should look like: ssh-ed25519 AAAA... fieldbrix-prod
```

---

## Step 3 — Find the latest Amazon Linux 2023 ARM64 AMI

Your EC2 runs Amazon Linux 2023 on ARM (t4g is ARM). The AMI ID changes
when Amazon releases updates. Get the current one:

```bash
aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 \
  --query 'Parameter.Value' \
  --output text \
  --region ap-south-1 \
  --profile fieldbrix

# Output example: ami-07c8b91119c5b1b1e
# Copy this — you'll need it in Step 7
```

---

## Step 4 — Bootstrap Terraform state

Terraform needs an S3 bucket to store its state file and a DynamoDB table
for locking. Run this ONCE before anything else.

```bash
AWS_PROFILE=fieldbrix ./scripts/bootstrap.sh

# Output will show:
# ✓ Created bucket: fieldbrix-tfstate-123456789012
# ✓ Created DynamoDB table: fieldbrix-terraform-locks

# Now update environments/prod/backend.tf with your account ID:
# Replace REPLACE_WITH_YOUR_ACCOUNT_ID with the number from the output
nano environments/prod/backend.tf
```

---

## Step 5 — Cloudflare setup (free DNS + SSL)

### 5a. Sign up at cloudflare.com (free plan)
### 5b. Add your domain (e.g., fieldbrix.in)
### 5c. Get your Zone ID

```
Cloudflare dashboard
→ Click your domain
→ Right sidebar → API section
→ Copy "Zone ID"

Example: abc123def456abc123def456abc123def456
```

### 5d. Create an API token

```
Cloudflare → My Profile → API Tokens → Create Token
→ Use template: Edit zone DNS
→ Zone Resources: Include → Specific zone → your domain
→ Create token
→ Copy the token (shown only once)

Store it safely — you'll use it in Step 6
```

---

## Step 6 — Store all secrets in SSM Parameter Store (free)

All runtime secrets go here. Never in code or Terraform files.

```bash
AWS_PROFILE=fieldbrix ./scripts/secrets-init.sh prod

# You will be prompted to enter each secret interactively:
# RDS master password        → make it strong (e.g., use: openssl rand -base64 32)
# JWT signing secret         → use: openssl rand -base64 64
# JWT refresh secret         → use: openssl rand -base64 64 (DIFFERENT from above)
# Razorpay secret key        → from Razorpay dashboard (press Enter to skip if not ready)
# MSG91 auth key             → from MSG91 dashboard (press Enter to skip if not ready)
# WhatsApp BSP token         → from your BSP (press Enter to skip if not ready)
# Cloudflare API token       → the token you created in Step 5d
# Grafana Loki user ID       → from Grafana Cloud → Connections → Loki (press Enter to skip)
# Grafana API key            → from Grafana Cloud → API Keys (press Enter to skip)
# Hosted Sentry backend DSN  → from Sentry project settings (press Enter to skip)

# Verify secrets were stored (values hidden):
aws ssm get-parameters-by-path \
  --path "/fieldbrix/prod" \
  --region ap-south-1 \
  --profile fieldbrix \
  --query "Parameters[*].Name"
```

---

## Step 7 — Configure Terraform variables

```bash
cd environments/prod
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

Fill in these values:

```hcl
env    = "prod"
region = "ap-south-1"

# Network (keep these defaults — no need to change)
vpc_cidr              = "10.0.0.0/16"
public_subnet_cidr_a  = "10.0.1.0/24"
public_subnet_cidr_b  = "10.0.2.0/24"
private_subnet_cidr_a = "10.0.3.0/24"

# Your current IP for SSH access
# Run: curl -s ifconfig.me   to find your IP
# Use format: "x.x.x.x/32"
admin_cidr = "YOUR_IP_HERE/32"

# EC2 settings
ec2_instance_type = "t4g.medium"

# AMI from Step 3
ami_id = "ami-PASTE_FROM_STEP_3"

# SSH public key from Step 2
ssh_public_key_path = "~/.ssh/fieldbrix_prod.pub"

# Database
db_instance_class = "db.t3.micro"

# Your app domains (change to your actual domain)
cors_allowed_origins = ["https://app.fieldbrix.in", "https://api.fieldbrix.in"]

# Cloudflare zone ID from Step 5c
cloudflare_zone_id = "PASTE_FROM_STEP_5"

# Your email for billing/CloudWatch alerts
alert_email = "you@yourcompany.com"
```

---

## Step 8 — Create all infrastructure

```bash
cd ../../   # back to infra root

# Dry run — read this output carefully before applying
AWS_PROFILE=fieldbrix ./scripts/plan.sh prod

# Review the plan output. You should see ~25 resources to add.
# If it looks correct:
AWS_PROFILE=fieldbrix ./scripts/apply.sh prod

# Takes about 8 minutes (RDS takes the longest).
# Output at the end:
# api_public_ip = "x.x.x.x"   ← your static IP
# web_bucket    = "fieldbrix-prod-web"
```

---

## Step 9 — Point Cloudflare DNS to your server

After apply completes, get your static IP:

```bash
cd environments/prod
terraform output api_public_ip
```

In Cloudflare dashboard:
```
→ DNS → Records → Add record
Type: A
Name: api          (creates api.fieldbrix.in)
IPv4: paste your static IP
Proxy: On (orange cloud)
TTL: Auto
Save

→ Add another record
Type: A
Name: @            (creates fieldbrix.in)
IPv4: same static IP
Proxy: On
Save
```

This IP never changes — even when you stop/start the EC2.
The Elastic IP stays allocated to your account permanently.

---

## Step 10 — Verify everything works

```bash
# Install Python dependencies for ops scripts
cd scripts/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run health check
python health_check.py --env prod --profile fieldbrix

# Expected output:
# EC2 instance     ✓ OK    Running — x.x.x.x
# RDS PostgreSQL   ✓ OK    Available — fieldbrix-prod.xxx.rds.amazonaws.com
# SSM secrets      ✓ OK    All 9 secrets present
# SQS queues       ✓ OK    All 4 queues present
# S3 buckets       ✓ OK    All 4 buckets exist
```

---

## Step 11 — SSH into your EC2

```bash
# Easy way (uses the script):
AWS_PROFILE=fieldbrix ./scripts/ssh.sh prod

# Manual way:
ssh -i ~/.ssh/fieldbrix_prod ec2-user@$(cd environments/prod && terraform output -raw api_public_ip)

# Once inside, check the app:
pm2 status                    # see if NestJS is running
pm2 logs --lines 50           # last 50 log lines
sudo systemctl status pgbouncer  # check PgBouncer
```

---

## Step 12 — Connect to RDS locally (for DB management)

RDS is not publicly accessible. Connect via SSH tunnel:

```bash
# In one terminal — create the tunnel
./scripts/db-tunnel.sh prod
# This forwards localhost:5433 → RDS via EC2

# In another terminal — connect with any Postgres client
psql -h localhost -p 5433 -U fieldbrix_admin -d fieldbrix

# Or with DBeaver/TablePlus:
# Host: localhost
# Port: 5433
# Database: fieldbrix
# User: fieldbrix_admin
# Password: (the db_password you set in Step 6)
```

---

## Step 13 — Stop/start to save money (IMPORTANT)

**You do not need the server running while you sleep.**
Stop it at night, start it in the morning. Data is 100% preserved.

```bash
# Stop before sleeping (~saves $14/month if done nightly + weekends)
AWS_PROFILE=fieldbrix ./scripts/stop.sh prod

# Start in the morning (takes ~3 minutes for RDS to be ready)
AWS_PROFILE=fieldbrix ./scripts/start.sh prod

# Check current state
AWS_PROFILE=fieldbrix ./scripts/status.sh prod
```

**What happens to your static IP when stopped:**
The Elastic IP stays allocated to your account. DNS continues to point
to the same IP. When you start again, the same IP is immediately active.
Cost while stopped: $0.005/hour per the EIP = $0.12 for 12 hours.

**Cost comparison:**
```
Always on:              ~$31/month  →  $100 lasts about 3.2 months
Stop 10hrs/night:       ~$22/month  →  $100 lasts about 4.5 months
Stop nights + weekends: ~$16/month  →  $100 lasts about 6.2 months
```

---

## Troubleshooting

### "terraform init fails with backend error"
```bash
# Check the bucket name in backend.tf matches what bootstrap.sh created
aws s3 ls --profile fieldbrix | grep fieldbrix-tfstate
```

### "EC2 won't start after being stopped"
```bash
AWS_PROFILE=fieldbrix ./scripts/status.sh prod
# Check if RDS is still starting — it takes 2-3 minutes
# EC2 should start fine independently of RDS
```

### "SSH permission denied"
```bash
# Make sure your current IP matches admin_cidr in terraform.tfvars
curl -s ifconfig.me
# If your IP changed, update admin_cidr and run ./scripts/plan.sh + apply.sh prod
```

### "App not responding after EC2 start"
```bash
./scripts/ssh.sh prod
pm2 status
# If stopped: pm2 start all
# Check logs: pm2 logs
# Restart: pm2 restart all
```

### "RDS auto-restarted on its own"
AWS automatically restarts a stopped RDS instance after 7 days. This is
an AWS limitation. If you stop RDS on Friday, it will restart automatically
by Friday the following week. Run stop.sh again to stop it.

### "EIP is costing money"
EIP only costs $0.005/hr when EC2 is STOPPED. When EC2 is RUNNING, EIP is free.
Use start.sh to start EC2 and the charge stops.

### Check AWS credits remaining
```bash
python scripts/python/cost_report.py
```

---

## Credential reference

| What | Where stored | How to update |
|------|-------------|---------------|
| DB password | SSM `/fieldbrix/prod/db_password` | `./scripts/rotate_secret.py --env prod --secret db_password` |
| JWT secret | SSM `/fieldbrix/prod/jwt_secret` | Same as above |
| Razorpay key | SSM `/fieldbrix/prod/razorpay_key_secret` | Same |
| MSG91 key | SSM `/fieldbrix/prod/msg91_auth_key` | Same |
| WhatsApp token | SSM `/fieldbrix/prod/whatsapp_bsp_token` | Same |
| Cloudflare token | SSM `/fieldbrix/prod/cloudflare_token` | Same |
| Grafana Loki ID | SSM `/fieldbrix/prod/grafana_loki_user_id` | Same |
| Grafana API key | SSM `/fieldbrix/prod/grafana_api_key` | Same |
| Sentry DSN | SSM `/fieldbrix/prod/sentry_dsn` | Same |
| AWS developer login | `~/.aws/config` profile `fieldbrix`; temporary STS cache | `aws configure sso --profile fieldbrix` |
| SSH private key | `~/.ssh/fieldbrix_prod` | generate new, run terraform apply |
| Cloudflare zone ID | `terraform.tfvars` | update + terraform apply |

---

## What each folder does

```
environments/prod/   Terraform config for production
  backend.tf         S3 state bucket + DynamoDB lock table location
  main.tf            Calls all modules, wires them together
  variables.tf       All inputs (instance type, region, etc.)
  outputs.tf         Useful values after apply (IP, bucket names)
  terraform.tfvars   YOUR values (gitignored, never committed)

modules/
  networking/        VPC, subnets, security groups, internet gateway
  compute/           EC2, IAM role, SSH key, Elastic IP
  database/          RDS PostgreSQL, parameter group, subnet group
  storage/           S3 buckets (photos, PDFs, exports, web)
  queues/            SQS queues for async jobs (PDF, notifications, etc.)
  monitoring/        CloudWatch alarms, SNS email alerts, log groups
  dns/               Cloudflare DNS records + SSL settings

scripts/
  bootstrap.sh       One-time: create S3 + DynamoDB for Terraform state
  aws-login.sh       Log in with AWS SSO when needed and verify the STS identity
  secrets-init.sh    One-time per env: store secrets in SSM
  plan.sh            Dry run — see what Terraform will do
  apply.sh           Apply the plan — create/update infrastructure
  stop.sh            Stop EC2 + RDS to save money
  start.sh           Start EC2 + RDS back up
  status.sh          Show current state + estimated cost
  ssh.sh             SSH into EC2 in one command
  db-tunnel.sh       SSH tunnel to RDS for local DB access
  destroy.sh         Delete everything (with confirmation)
  python/            Python scripts for migrations, monitoring, etc.
```
