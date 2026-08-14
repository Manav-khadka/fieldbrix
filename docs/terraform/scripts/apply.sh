#!/usr/bin/env bash
# Apply the plan created by plan.sh. Will NOT apply without a plan file.
# Usage: ./scripts/apply.sh <env>
set -euo pipefail

AWS_PROFILE_NAME=${AWS_PROFILE:-fieldbrix}
export AWS_PROFILE="${AWS_PROFILE_NAME}"

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
echo "  1. Point both DNS A records to: $(terraform output -raw static_ip)"
echo "  2. Configure TLS after DNS resolves: ./scripts/configure-tls.sh ${ENV}"
echo "  3. Deploy apps: ./scripts/deploy-apps.sh ${ENV}"
echo "  4. Verify: curl --fail $(terraform output -raw api_url)/health/ready"
