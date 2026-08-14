#!/usr/bin/env bash
# Start EC2 + RDS. Data is exactly as you left it.
# Static IP is immediately active — DNS never breaks.
# Takes ~3 minutes (RDS is the slow part).
#
# Usage: ./scripts/start.sh <env>
set -euo pipefail

ENV=${1:?Usage: start.sh <env>}
REGION="ap-south-1"

echo ""
echo "=== Starting Fieldbrix ${ENV} ==="

# Start RDS first (kicks off in background while we start EC2)
DB_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "fieldbrix-${ENV}" \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text --region "${REGION}" 2>/dev/null || echo "not-found")

if [ "${DB_STATUS}" = "stopped" ]; then
  aws rds start-db-instance --db-instance-identifier "fieldbrix-${ENV}" --region "${REGION}" > /dev/null
  echo "✓ RDS starting (this takes 2-3 minutes...)"
elif [ "${DB_STATUS}" = "available" ]; then
  echo "RDS: already running"
else
  echo "RDS: ${DB_STATUS}"
fi

# Start EC2
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-api" \
            "Name=instance-state-name,Values=stopped" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text --region "${REGION}")

if [ "${INSTANCE_ID}" = "None" ] || [ -z "${INSTANCE_ID}" ]; then
  echo "EC2: already running"
else
  aws ec2 start-instances --instance-ids "${INSTANCE_ID}" --region "${REGION}" > /dev/null
  echo "✓ EC2 starting..."
  aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}" --region "${REGION}"
  echo "✓ EC2 is running"
fi

# Get static IP
STATIC_IP=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-eip" \
  --query "Addresses[0].PublicIp" \
  --output text --region "${REGION}" 2>/dev/null || echo "unknown")

# Wait for RDS
echo "Waiting for RDS to be ready..."
aws rds wait db-instance-available \
  --db-instance-identifier "fieldbrix-${ENV}" \
  --region "${REGION}" && echo "✓ RDS is ready"

echo ""
python3 - "${STATIC_IP}" << 'PYEOF'
import sys
static_ip = sys.argv[1]
EC2_PER_HOUR  = 0.0224
RDS_PER_HOUR  = 0.017
EBS_PER_HOUR  = 0.0033
RDS_STOR_HOUR = 0.0032
running_hr    = EC2_PER_HOUR + RDS_PER_HOUR + EBS_PER_HOUR + RDS_STOR_HOUR

print(f"Stack is running.")
print(f"Static IP:    {static_ip}  (same as always — DNS still works)")
print(f"Running cost: ${running_hr:.4f}/hr  →  ${running_hr * 24:.2f}/day")
print()
print("Stop before sleeping:")
print("  ./scripts/stop.sh <env>    saves ~$0.45 for every 8 hours")
PYEOF
