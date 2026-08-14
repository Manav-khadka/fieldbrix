#!/usr/bin/env bash
# Store all runtime secrets in SSM Parameter Store (free, KMS-encrypted).
# Prompts interactively — secrets never appear in shell history or log files.
# Existing parameters are preserved. Pass --force only when intentionally rotating.
# Usage: ./scripts/secrets-init.sh <env> [--force]
set -euo pipefail

ENV=${1:?Usage: secrets-init.sh <env> [--force]}
FORCE=${2:-}
REGION="ap-south-1"
PREFIX="/fieldbrix/${ENV}"

store() {
  local name=$1 desc=$2

  if [[ "${FORCE}" != "--force" ]] && aws ssm get-parameter \
    --name "${PREFIX}/${name}" \
    --region "${REGION}" >/dev/null 2>&1; then
    echo "  = /fieldbrix/${ENV}/${name} (already present; preserved)"
    return
  fi

  read -rsp "  ${desc}: " VAL; echo ""
  if [[ -z "${VAL}" ]]; then
    echo "  - /fieldbrix/${ENV}/${name} (skipped)"
    return
  fi
  aws ssm put-parameter \
    --name "${PREFIX}/${name}" \
    --description "Fieldbrix ${ENV} — ${desc}" \
    --type "SecureString" \
    --value "${VAL}" \
    --overwrite \
    --region "${REGION}" > /dev/null
  echo "  ✓ /fieldbrix/${ENV}/${name}"
}

echo ""
echo "=== Fieldbrix Secrets Setup: ${ENV} ==="
echo "Encrypted with AWS KMS (free default key)"
echo "Generate random values with: openssl rand -base64 32"
echo ""

store "db_password"          "RDS password (openssl rand -base64 32)"
store "jwt_secret"           "JWT signing secret (openssl rand -base64 64)"
store "jwt_refresh_secret"   "JWT refresh secret (different value, openssl rand -base64 64)"
store "razorpay_key_secret"  "Razorpay secret key (press Enter to skip)"
store "msg91_auth_key"       "MSG91 API auth key (press Enter to skip)"
store "whatsapp_bsp_token"   "WhatsApp BSP API token (press Enter to skip)"
store "cloudflare_token"     "Cloudflare API token"
store "grafana_loki_user_id" "Grafana Cloud Loki user ID (press Enter to skip)"
store "grafana_api_key"      "Grafana Cloud API key (press Enter to skip)"
store "sentry_dsn"           "Hosted Sentry backend DSN (press Enter to skip)"

echo ""
echo "✓ Secret setup complete (existing values preserved; blank values skipped)."
echo ""
echo "Verify:"
echo "  aws ssm get-parameters-by-path --path '${PREFIX}' --region ${REGION} --query 'Parameters[*].Name'"
