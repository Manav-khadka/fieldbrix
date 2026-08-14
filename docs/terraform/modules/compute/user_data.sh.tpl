#!/bin/bash
# Runs once on first EC2 boot. Installs all dependencies.
# If this fails, SSH in and check: sudo cat /var/log/cloud-init-output.log
set -euo pipefail
exec > >(tee /var/log/fieldbrix-init.log) 2>&1

echo "=== Fieldbrix Bootstrap starting at $(date) ==="

# ── System updates ─────────────────────────────────────────────────────────
dnf update -y
dnf install -y postgresql15 pgbouncer git htop

# ── Node.js 22 (ARM64 compatible) ─────────────────────────────────────────
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs
node --version
npm install -g pm2

# ── PM2 startup (survives EC2 reboots) ────────────────────────────────────
pm2 startup systemd -u ec2-user --hp /home/ec2-user
systemctl enable pm2-ec2-user

# ── Swap file (prevents OOM on 4GB RAM) ───────────────────────────────────
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── PgBouncer ─────────────────────────────────────────────────────────────
# App connects to localhost:5432 → PgBouncer → RDS
# Transaction pooling mode: multiplies effective RDS connections 5-10x
# RDS db.t3.micro supports 87 connections; PgBouncer makes it feel like 200+

# Get DB password from SSM (EC2 IAM role handles auth automatically)
DB_PASS=$(aws ssm get-parameter   --name "/fieldbrix/${env}/db_password"   --with-decryption   --query "Parameter.Value"   --output text   --region "${region}")

cat > /etc/pgbouncer/pgbouncer.ini << 'PGEOF'
[databases]
fieldbrix = host=${rds_endpoint} port=5432 dbname=fieldbrix

[pgbouncer]
listen_addr          = 127.0.0.1
listen_port          = 5432
auth_type            = scram-sha-256
auth_file            = /etc/pgbouncer/userlist.txt
pool_mode            = transaction
max_client_conn      = 200
default_pool_size    = 20
reserve_pool_size    = 5
server_tls_sslmode   = require
log_connections      = 0
log_disconnections   = 0
application_name_add_host = 1
PGEOF

# PgBouncer userlist (stores hashed credentials)
echo '"fieldbrix_admin" "'"$${DB_PASS}"'"' > /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/userlist.txt
chown pgbouncer:pgbouncer /etc/pgbouncer/userlist.txt

systemctl enable pgbouncer
systemctl start pgbouncer
echo "✓ PgBouncer started"

# ── CloudWatch Agent (sends logs to CloudWatch) ────────────────────────────
dnf install -y amazon-cloudwatch-agent

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWEOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/.pm2/logs/*.log",
            "log_group_name": "/fieldbrix/${env}/api",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
CWEOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl   -a fetch-config -m ec2 -s   -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "=== Bootstrap complete at $(date) ==="
echo "Next: deploy app via GitHub Actions or manually via SSH"
echo "Connect: ssh -i ~/.ssh/fieldbrix_prod ec2-user@$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
