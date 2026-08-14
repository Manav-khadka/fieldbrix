#!/usr/bin/env bash
# SSH into EC2 in one command.
# Reads the static IP from AWS automatically.
# Usage: ./scripts/ssh.sh <env>
set -euo pipefail

ENV=${1:?Usage: ssh.sh <env>}
REGION="ap-south-1"

# Get static IP from Elastic IP (always the same even after stop/start)
IP=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-eip" \
  --query "Addresses[0].PublicIp" \
  --output text --region "${REGION}" 2>/dev/null)

if [ -z "${IP}" ] || [ "${IP}" = "None" ]; then
  echo "✗ Could not find Elastic IP for fieldbrix-${ENV}-eip"
  echo "  Run: aws ec2 describe-addresses --region ${REGION}"
  exit 1
fi

# Try prod key first, then dev key
KEY="~/.ssh/fieldbrix_prod"
if [ "${ENV}" != "prod" ]; then
  KEY="~/.ssh/fieldbrix_${ENV}"
fi

echo "→ Connecting to ${IP}..."
echo "  (Ctrl+D or 'exit' to disconnect)"
echo ""
ssh -i "${KEY}" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  ec2-user@"${IP}"
