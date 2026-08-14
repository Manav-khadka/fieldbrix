#!/usr/bin/env bash
# Apply the plan created by plan.sh. Will NOT apply without a plan file.
# Usage: ./scripts/apply.sh <env>
set -euo pipefail

ENV=${1:?Usage: apply.sh <env>}
DIR="$(dirname "$0")/../environments/${ENV}"

if [ ! -f "${DIR}/${ENV}.tfplan" ]; then
  echo "✗ No plan file found. Run ./scripts/plan.sh ${ENV} first."
  exit 1
fi

cd "${DIR}"
terraform apply "${ENV}.tfplan"
rm -f "${ENV}.tfplan"

echo ""
echo "✓ Apply complete."
echo ""
echo "Outputs:"
terraform output

echo ""
echo "Next steps:"
echo "  1. Point Cloudflare DNS A record to: $(terraform output -raw api_public_ip 2>/dev/null || echo 'see above')"
echo "  2. Verify: python scripts/python/health_check.py --env ${ENV}"
echo "  3. SSH in: ./scripts/ssh.sh ${ENV}"
