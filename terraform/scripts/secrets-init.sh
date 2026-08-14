#!/usr/bin/env bash
# Creates or updates the one runtime secret consumed by the production instance.
# Usage: ./scripts/secrets-init.sh <env>
set -euo pipefail

ENVIRONMENT=${1:?Usage: secrets-init.sh <env>}
REGION=${AWS_REGION:-ap-south-1}
SECRET_ID="fieldbrix/${ENVIRONMENT}/runtime"

read -rsp "RDS password for ${ENVIRONMENT}: " DATABASE_PASSWORD
printf '\n'
test -n "${DATABASE_PASSWORD}" || {
  echo "A database password is required." >&2
  exit 1
}

SECRET_JSON=$(jq -cn --arg password "${DATABASE_PASSWORD}" '{DB_PASSWORD: $password}')

if aws secretsmanager describe-secret --secret-id "${SECRET_ID}" --region "${REGION}" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value \
    --secret-id "${SECRET_ID}" \
    --secret-string "${SECRET_JSON}" \
    --region "${REGION}" >/dev/null
  echo "Updated ${SECRET_ID}."
else
  echo "Secret ${SECRET_ID} is Terraform-managed; apply Terraform before initializing it." >&2
  exit 1
fi

echo "Do not print the secret value. Verify only its metadata with:"
echo "aws secretsmanager describe-secret --secret-id ${SECRET_ID} --region ${REGION}"
