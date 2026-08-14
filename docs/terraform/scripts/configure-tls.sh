#!/usr/bin/env bash
# Install or repair Let's Encrypt TLS automation through AWS Systems Manager.
# Usage: ./scripts/configure-tls.sh <env> [contact-email] [admin-domain] [api-domain]
set -euo pipefail

DEPLOY_ENV=${1:?Usage: configure-tls.sh <env> [contact-email] [admin-domain] [api-domain]}
TLS_CONTACT_EMAIL=${2:-}
ADMIN_DOMAIN=${3:-admin.fieldbrix.com}
API_DOMAIN=${4:-api.fieldbrix.com}
AWS_PROFILE_NAME=${AWS_PROFILE:-fieldbrix}
AWS_REGION_NAME=${AWS_REGION:-ap-south-1}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../environments/${DEPLOY_ENV}"
COMPUTE_DIR="${SCRIPT_DIR}/../modules/compute"

for command_name in aws base64 jq terraform; do
  command -v "${command_name}" >/dev/null || {
    echo "Missing required command: ${command_name}" >&2
    exit 1
  }
done

if [[ -n "${TLS_CONTACT_EMAIL}" ]] && [[ ! "${TLS_CONTACT_EMAIL}" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "Invalid TLS contact email: ${TLS_CONTACT_EMAIL}" >&2
  exit 2
fi

AWS_PROFILE="${AWS_PROFILE_NAME}" terraform -chdir="${TF_DIR}" output >/dev/null
INSTANCE_ID="$(AWS_PROFILE="${AWS_PROFILE_NAME}" terraform -chdir="${TF_DIR}" output -raw instance_id)"
STATIC_IP="$(AWS_PROFILE="${AWS_PROFILE_NAME}" terraform -chdir="${TF_DIR}" output -raw static_ip)"
INSTALLER_B64="$(base64 < "${COMPUTE_DIR}/install-tls.sh" | tr -d '\n')"
MAINTAINER_B64="$(base64 < "${COMPUTE_DIR}/tls-maintain.sh" | tr -d '\n')"

PARAMETERS="$(jq -cn \
  --arg installer "${INSTALLER_B64}" \
  --arg maintainer "${MAINTAINER_B64}" \
  --arg email "${TLS_CONTACT_EMAIL}" \
  --arg admin "${ADMIN_DOMAIN}" \
  --arg api "${API_DOMAIN}" \
  '{commands:[
    "set -euo pipefail",
    ("printf %s " + ($installer | @sh) + " | base64 -d > /tmp/fieldbrix-install-tls"),
    ("printf %s " + ($maintainer | @sh) + " | base64 -d > /usr/local/sbin/fieldbrix-tls-maintain"),
    "install -m 0755 /tmp/fieldbrix-install-tls /usr/local/sbin/fieldbrix-install-tls",
    "chmod 0755 /usr/local/sbin/fieldbrix-tls-maintain",
    ("/usr/local/sbin/fieldbrix-install-tls " + ($email | @sh) + " " + ($admin | @sh) + " " + ($api | @sh)),
    "systemctl list-timers fieldbrix-tls.timer --no-pager",
    "systemctl show fieldbrix-tls.service --property=Result --property=ExecMainStatus",
    "certbot certificates"
  ]}')"

COMMAND_ID="$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name AWS-RunShellScript \
  --comment "Configure FieldBrix Let's Encrypt TLS" \
  --parameters "${PARAMETERS}" \
  --profile "${AWS_PROFILE_NAME}" \
  --region "${AWS_REGION_NAME}" \
  --query 'Command.CommandId' \
  --output text)"

if ! aws ssm wait command-executed \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --profile "${AWS_PROFILE_NAME}" \
  --region "${AWS_REGION_NAME}"; then
  aws ssm get-command-invocation \
    --command-id "${COMMAND_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --profile "${AWS_PROFILE_NAME}" \
    --region "${AWS_REGION_NAME}"
  exit 1
fi

aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --profile "${AWS_PROFILE_NAME}" \
  --region "${AWS_REGION_NAME}" \
  --query '{Status:Status,Output:StandardOutputContent,Errors:StandardErrorContent}' \
  --output json

echo "TLS configured on ${STATIC_IP}."
echo "Admin: https://${ADMIN_DOMAIN}"
echo "API:   https://${API_DOMAIN}/health/ready"
