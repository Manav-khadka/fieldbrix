#!/usr/bin/env bash
# Creates or updates the encrypted SSM runtime parameters consumed by production.
# Usage: ./scripts/secrets-init.sh <env>
set -euo pipefail

ENVIRONMENT=${1:?Usage: secrets-init.sh <env>}
REGION=${AWS_REGION:-ap-south-1}
DB_PARAMETER="/fieldbrix/${ENVIRONMENT}/db_password"

read -rsp "RDS password for ${ENVIRONMENT}: " DATABASE_PASSWORD
printf '\n'
test -n "${DATABASE_PASSWORD}" || {
  echo "A database password is required." >&2
  exit 1
}

aws ssm put-parameter \
  --name "${DB_PARAMETER}" \
  --type SecureString \
  --value "${DATABASE_PASSWORD}" \
  --overwrite \
  --tier Standard \
  --region "${REGION}" >/dev/null
echo "Updated ${DB_PARAMETER}."

echo "Do not print the secret value. Verify only its metadata with:"
echo "aws ssm get-parameter --name ${DB_PARAMETER} --region ${REGION}"
