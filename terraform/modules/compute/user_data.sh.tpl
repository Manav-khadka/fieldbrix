#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/fieldbrix-init.log) 2>&1

echo "=== FieldBrix bootstrap starting at $(date -u +%FT%TZ) ==="

dnf update -y
dnf install -y nginx postgresql15 git jq openssl util-linux
dnf install -y amazon-cloudwatch-agent || true

# Amazon Linux 2023 includes the SSM agent. It is the only administrative path;
# port 22 is not exposed and no SSH key is installed.
systemctl enable --now amazon-ssm-agent

# Node 24 is the current LTS line used by the bootstrap deployment.
curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
dnf install -y nodejs
npm install --global pnpm@10.29.3

install -d -m 0755 /var/www/fieldbrix-admin
install -d -m 0755 /opt/fieldbrix/backend/releases
# The service user must be able to traverse this directory to read the public
# RDS CA bundle. The environment file below remains root-only (0600).
install -d -m 0755 /etc/fieldbrix

curl -fsSL https://truststore.pki.rds.amazonaws.com/ap-south-1/ap-south-1-bundle.pem \
  -o /etc/fieldbrix/rds-ca.pem
chmod 0644 /etc/fieldbrix/rds-ca.pem

cat > /var/www/fieldbrix-admin/index.html <<'HTML'
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FieldBrix Admin</title></head>
  <body style="margin:0;background:#fff;color:#111;font:16px system-ui;display:grid;min-height:100vh;place-items:center">
    <main><h1 style="font-size:24px;font-weight:600">FieldBrix Admin</h1><p>Deployment is initializing.</p></main>
  </body>
</html>
HTML

cat > /etc/nginx/conf.d/fieldbrix.conf <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${admin_domain};

    root /var/www/fieldbrix-admin;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${api_domain};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

rm -f /etc/nginx/conf.d/default.conf
nginx -t
systemctl enable --now nginx

# Install a retry-safe Let's Encrypt job. Initial issuance may fail until both
# DNS records point at this instance; the persistent timer retries automatically.
printf '%s' '${tls_installer_script_b64}' | base64 -d \
  > /usr/local/sbin/fieldbrix-install-tls
printf '%s' '${tls_maintainer_script_b64}' | base64 -d \
  > /usr/local/sbin/fieldbrix-tls-maintain
chmod 0755 \
  /usr/local/sbin/fieldbrix-install-tls \
  /usr/local/sbin/fieldbrix-tls-maintain

if ! /usr/local/sbin/fieldbrix-install-tls \
  '${tls_contact_email}' \
  '${admin_domain}' \
  '${api_domain}'; then
  echo "TLS issuance is pending; fieldbrix-tls.timer will retry after DNS resolves."
fi

# Store the database password encoded so arbitrary characters remain safe in an
# EnvironmentFile. The NestJS process decodes it in memory before connecting.
DB_PASS=$(aws ssm get-parameter \
  --name "${database_password_parameter_name}" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --region "${region}")
SENTRY_DSN=$(aws ssm get-parameter \
  --name "${sentry_dsn_parameter_name}" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --region "${region}")
DB_PASS_B64=$(printf '%s' "$DB_PASS" | base64 -w 0)

cat > /etc/fieldbrix/backend.env <<ENV
NODE_ENV=production
APP_ENV=${env}
PORT=3000
ADMIN_ORIGIN=https://${admin_domain}
DB_HOST=${rds_address}
DB_PORT=${rds_port}
DB_NAME=fieldbrix
DB_USER=fieldbrix_admin
DB_PASSWORD_B64=$DB_PASS_B64
S3_BUCKET=${application_bucket}
SQS_QUEUE_URL=${application_queue_url}
NODE_EXTRA_CA_CERTS=/etc/fieldbrix/rds-ca.pem
SENTRY_DSN=$SENTRY_DSN
SENTRY_ENVIRONMENT=${env}
ENV
chmod 0600 /etc/fieldbrix/backend.env

cat > /etc/systemd/system/fieldbrix-api.service <<'SERVICE'
[Unit]
Description=FieldBrix NestJS API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ec2-user
Group=ec2-user
WorkingDirectory=/opt/fieldbrix/backend/current
EnvironmentFile=/etc/fieldbrix/backend.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICE

if command -v amazon-cloudwatch-agent-ctl >/dev/null 2>&1; then
  cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<CW
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/fieldbrix/${env}/system",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
CW
  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json || true
fi

echo "=== FieldBrix bootstrap complete at $(date -u +%FT%TZ) ==="
