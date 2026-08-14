#!/usr/bin/env bash
# DESTROYS all infrastructure for an environment.
# The bootstrap stack is disposable when protect_database=false.
# Usage: ./scripts/destroy.sh <env>
set -euo pipefail

ENV=${1:?Usage: destroy.sh <env>}
AWS_PROFILE_NAME=${AWS_PROFILE:-fieldbrix}
export AWS_PROFILE="${AWS_PROFILE_NAME}"
echo "WARNING: This will DESTROY all ${ENV} infrastructure."
echo "RDS data will be lost (unless you take a snapshot first)."
echo ""
echo "Type the environment name to confirm: "
read -r CONFIRM
[ "${CONFIRM}" != "${ENV}" ] && echo "Aborted." && exit 1
cd "$(dirname "$0")/../environments/${ENV}"
terraform destroy -var-file="terraform.tfvars"
