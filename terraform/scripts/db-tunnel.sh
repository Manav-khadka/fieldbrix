#!/usr/bin/env bash
# Creates a Systems Manager port-forwarding tunnel to RDS.
# After running this, connect to: localhost:5433
#
# Usage: ./scripts/db-tunnel.sh <env>
# Keep this terminal open while using the DB connection.
# Press Ctrl+C to close the tunnel.
set -euo pipefail

ENV=${1:?Usage: db-tunnel.sh <env>}
REGION="ap-south-1"
LOCAL_PORT=5433

INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-api" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text --region "${REGION}")

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "fieldbrix-${ENV}" \
  --query "DBInstances[0].Endpoint.Address" \
  --output text --region "${REGION}" 2>/dev/null)

if [ -z "${INSTANCE_ID}" ] || [ "${INSTANCE_ID}" = "None" ]; then
  echo "✗ EC2 not found or not running. Start it first: ./scripts/start.sh ${ENV}"
  exit 1
fi

echo "════════════════════════════════════════════"
echo "Systems Manager tunnel: localhost:${LOCAL_PORT} → RDS"
echo ""
echo "Connect with:"
echo "  psql -h localhost -p ${LOCAL_PORT} -U fieldbrix_admin -d fieldbrix"
echo ""
echo "Or DBeaver/TablePlus:"
echo "  Host: localhost  Port: ${LOCAL_PORT}"
echo "  Database: fieldbrix  User: fieldbrix_admin"
echo "  Password: (from encrypted SSM parameter /fieldbrix/${ENV}/db_password)"
echo ""
echo "Press Ctrl+C to close the tunnel"
echo "════════════════════════════════════════════"

aws ssm start-session \
  --target "${INSTANCE_ID}" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "host=[\"${RDS_ENDPOINT}\"],portNumber=[\"5432\"],localPortNumber=[\"${LOCAL_PORT}\"]" \
  --region "${REGION}"
