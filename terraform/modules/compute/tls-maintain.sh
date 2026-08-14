#!/usr/bin/env bash
set -euo pipefail

exec 9>/run/lock/fieldbrix-tls.lock
if ! flock -n 9; then
  echo "Another FieldBrix TLS maintenance run is already active."
  exit 0
fi

: "${TLS_CONTACT_EMAIL:=}"
: "${TLS_ADMIN_DOMAIN:?TLS_ADMIN_DOMAIN is required}"
: "${TLS_API_DOMAIN:?TLS_API_DOMAIN is required}"

certificate="/etc/letsencrypt/live/${TLS_ADMIN_DOMAIN}/fullchain.pem"
certbot_contact_args=(--register-unsafely-without-email)
if [[ -n "${TLS_CONTACT_EMAIL}" ]]; then
  certbot_contact_args=(--email "${TLS_CONTACT_EMAIL}")
fi

nginx -t

if [[ ! -s "${certificate}" ]]; then
  echo "No certificate exists yet; requesting one for ${TLS_ADMIN_DOMAIN} and ${TLS_API_DOMAIN}."
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    "${certbot_contact_args[@]}" \
    --cert-name "${TLS_ADMIN_DOMAIN}" \
    --domains "${TLS_ADMIN_DOMAIN}" \
    --domains "${TLS_API_DOMAIN}" \
    --redirect \
    --keep-until-expiring
else
  # This is safe to run frequently. Certbot only renews certificates that are
  # inside their renewal window, and the deploy hook runs only after success.
  certbot renew \
    --quiet \
    --no-random-sleep-on-renew \
    --cert-name "${TLS_ADMIN_DOMAIN}" \
    --deploy-hook "/usr/bin/systemctl reload nginx"
fi

if [[ ! -s "${certificate}" ]]; then
  logger -p daemon.err -t fieldbrix-tls \
    "Certificate issuance has not succeeded for ${TLS_ADMIN_DOMAIN}."
  exit 1
fi

nginx -t

# Treat less than 14 days of remaining validity as an operational failure. This
# leaves time for DNS, firewall, or CA issues to be corrected before expiry.
if ! openssl x509 -checkend 1209600 -noout -in "${certificate}"; then
  expiry="$(openssl x509 -enddate -noout -in "${certificate}" | cut -d= -f2-)"
  logger -p daemon.crit -t fieldbrix-tls \
    "Certificate for ${TLS_ADMIN_DOMAIN} expires within 14 days (${expiry})."
  exit 1
fi

expiry="$(openssl x509 -enddate -noout -in "${certificate}" | cut -d= -f2-)"
echo "TLS certificate is healthy; expires ${expiry}."
