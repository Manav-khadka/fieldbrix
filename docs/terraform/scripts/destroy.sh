#!/usr/bin/env bash
# DESTROYS all infrastructure for an environment.
# RDS has deletion_protection=true in prod — Terraform will error safely.
# Usage: ./scripts/destroy.sh <env>
set -euo pipefail

ENV=${1:?Usage: destroy.sh <env>}
echo "WARNING: This will DESTROY all ${ENV} infrastructure."
echo "RDS data will be lost (unless you take a snapshot first)."
echo ""
echo "Type the environment name to confirm: "
read -r CONFIRM
[ "${CONFIRM}" != "${ENV}" ] && echo "Aborted." && exit 1
cd "$(dirname "$0")/../environments/${ENV}"
terraform destroy -var-file="terraform.tfvars"
