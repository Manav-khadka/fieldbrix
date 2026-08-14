#!/usr/bin/env bash
# Read-only drift detection. Exit 2 means drift was found; it never applies changes.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENVIRONMENT="${1:-prod}"
ENV_DIR="${ROOT_DIR}/environments/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}" ]; then
  echo "Unknown environment: ${ENVIRONMENT}" >&2
  exit 1
fi

terraform -chdir="${ENV_DIR}" init -input=false
set +e
terraform -chdir="${ENV_DIR}" plan -refresh-only -detailed-exitcode -input=false -no-color
RESULT=$?
set -e

case "${RESULT}" in
  0) echo "No Terraform drift detected for ${ENVIRONMENT}." ;;
  2) echo "Terraform drift detected for ${ENVIRONMENT}; review the read-only plan." >&2; exit 2 ;;
  *) exit "${RESULT}" ;;
esac
