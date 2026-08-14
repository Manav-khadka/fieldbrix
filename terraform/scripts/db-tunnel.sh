#!/usr/bin/env bash
# Creates an SSH tunnel to RDS so you can connect from your local machine.
# After running this, connect to: localhost:5433
#
# Usage: ./scripts/db-tunnel.sh <env>
# Keep this terminal open while using the DB connection.
# Press Ctrl+C to close the tunnel.
set -euo pipefail

ENV=${1:?Usage: db-tunnel.sh <env>}
REGION="ap-south-1"
LOCAL_PORT=5433

# Get EC2 static IP
EC2_IP=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-eip" \
  --query "Addresses[0].PublicIp" \
  --output text --region "${REGION}" 2>/dev/null)

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "fieldbrix-${ENV}" \
  --query "DBInstances[0].Endpoint.Address" \
  --output text --region "${REGION}" 2>/dev/null)

if [ -z "${EC2_IP}" ] || [ "${EC2_IP}" = "None" ]; then
  echo "✗ EC2 not found or not running. Start it first: ./scripts/start.sh ${ENV}"
  exit 1
fi

echo "════════════════════════════════════════════"
echo "SSH tunnel: localhost:${LOCAL_PORT} → RDS"
echo ""
echo "Connect with:"
echo "  psql -h localhost -p ${LOCAL_PORT} -U fieldbrix_admin -d fieldbrix"
echo ""
echo "Or DBeaver/TablePlus:"
echo "  Host: localhost  Port: ${LOCAL_PORT}"
echo "  Database: fieldbrix  User: fieldbrix_admin"
echo "  Password: (from SSM /fieldbrix/${ENV}/db_password)"
echo ""
echo "Press Ctrl+C to close the tunnel"
echo "════════════════════════════════════════════"

KEY="~/.ssh/fieldbrix_prod"
[ "${ENV}" != "prod" ] && KEY="~/.ssh/fieldbrix_${ENV}"

ssh -i "${KEY}" \
  -o StrictHostKeyChecking=no \
  -N \
  -L "${LOCAL_PORT}:${RDS_ENDPOINT}:5432" \
  ec2-user@"${EC2_IP}"
