#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: fieldbrix-install-tls <contact-email> <admin-domain> <api-domain>" >&2
  exit 2
fi

tls_contact_email=$1
tls_admin_domain=$2
tls_api_domain=$3

if [[ -n "${tls_contact_email}" ]] && [[ ! "${tls_contact_email}" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "Invalid TLS contact email: ${tls_contact_email}" >&2
  exit 2
fi

for domain in "${tls_admin_domain}" "${tls_api_domain}"; do
  if [[ ! "${domain}" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || [[ "${domain}" != *.* ]]; then
    echo "Invalid TLS domain: ${domain}" >&2
    exit 2
  fi
done

dnf install -y certbot python3-certbot-nginx openssl util-linux

install -d -m 0755 /etc/fieldbrix
cat > /etc/fieldbrix/tls.env <<EOF
TLS_CONTACT_EMAIL=${tls_contact_email}
TLS_ADMIN_DOMAIN=${tls_admin_domain}
TLS_API_DOMAIN=${tls_api_domain}
EOF
chmod 0600 /etc/fieldbrix/tls.env

cat > /etc/systemd/system/fieldbrix-tls.service <<'EOF'
[Unit]
Description=Issue, renew, and verify FieldBrix TLS certificates
After=network-online.target nginx.service
Wants=network-online.target
Requires=nginx.service
ConditionPathExists=/etc/fieldbrix/tls.env

[Service]
Type=oneshot
EnvironmentFile=/etc/fieldbrix/tls.env
ExecStart=/usr/local/sbin/fieldbrix-tls-maintain
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=/etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt /etc/nginx
EOF

cat > /etc/systemd/system/fieldbrix-tls.timer <<'EOF'
[Unit]
Description=Check FieldBrix TLS certificates twice daily

[Timer]
OnBootSec=5min
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=1h
Persistent=true
Unit=fieldbrix-tls.service

[Install]
WantedBy=timers.target
EOF

# Avoid an unmanaged duplicate timer from the OS package. Our timer also
# performs initial issuance retries and a 14-day expiry health check.
systemctl disable --now certbot-renew.timer >/dev/null 2>&1 || true
systemctl disable --now certbot.timer >/dev/null 2>&1 || true

systemctl daemon-reload
systemctl enable --now fieldbrix-tls.timer
systemctl start fieldbrix-tls.service
