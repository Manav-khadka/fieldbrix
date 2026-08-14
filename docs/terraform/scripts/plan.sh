#!/usr/bin/env bash
# Dry run — shows what Terraform WILL create/change/destroy. Nothing is changed.
# Always run this before apply.sh.
# Usage: ./scripts/plan.sh <env>
set -euo pipefail

AWS_PROFILE_NAME=${AWS_PROFILE:-fieldbrix}
export AWS_PROFILE="${AWS_PROFILE_NAME}"

ENV=${1:?Usage: plan.sh <env>}
DIR="$(dirname "$0")/../environments/${ENV}"

if [ ! -f "${DIR}/terraform.tfvars" ]; then
  echo "✗ terraform.tfvars not found."
  echo "  Copy and fill: cp environments/${ENV}/terraform.tfvars.example environments/${ENV}/terraform.tfvars"
  exit 1
fi

cd "${DIR}"
terraform init -reconfigure
terraform validate
terraform plan -out="${ENV}.tfplan" -var-file="terraform.tfvars"
echo ""
echo "✓ Plan saved. If the plan looks correct, run:"
echo "  ./scripts/apply.sh ${ENV}"
