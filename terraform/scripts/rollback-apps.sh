#!/usr/bin/env bash
# Re-activate an already uploaded immutable release without touching the database.
# Usage: ./scripts/rollback-apps.sh <env> <release-id>
set -euo pipefail

ENVIRONMENT=${1:?Usage: rollback-apps.sh <env> <release-id>}
RELEASE_ID=${2:?Usage: rollback-apps.sh <env> <release-id>}
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="${ROOT_DIR}/terraform/environments/${ENVIRONMENT}"
REGION=${AWS_REGION:-ap-south-1}

case "${RELEASE_ID}" in
  *[!A-Za-z0-9.-]*|"") echo "Invalid release ID." >&2; exit 1 ;;
esac

INSTANCE_ID=$(terraform -chdir="${TF_DIR}" output -raw instance_id)
PARAMETERS=$(jq -cn --arg release "${RELEASE_ID}" '{commands:[
  "set -euo pipefail",
  ("release=" + $release),
  "test -f /opt/fieldbrix/backend/releases/$release/release.env",
  "test -d /opt/fieldbrix/admin/releases/$release",
  "ln -sfn /opt/fieldbrix/admin/releases/$release /var/www/fieldbrix-admin",
  "ln -sfn /opt/fieldbrix/backend/releases/$release /opt/fieldbrix/backend/current",
  "systemctl daemon-reload && systemctl restart fieldbrix-api.service",
  "nginx -t && systemctl reload nginx",
  "curl --fail http://127.0.0.1:3000/health/live",
  "curl --fail http://127.0.0.1:3000/health/ready"
]}')

COMMAND_ID=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name AWS-RunShellScript \
  --parameters "${PARAMETERS}" \
  --region "${REGION}" \
  --query 'Command.CommandId' --output text)

aws ssm wait command-executed \
  --command-id "${COMMAND_ID}" --instance-id "${INSTANCE_ID}" --region "${REGION}"

echo "Rolled back application files to ${RELEASE_ID}; the database was not changed."
