#!/usr/bin/env bash
# Stop EC2 + RDS to save money while not working.
# Data is fully preserved. Static IP stays allocated.
#
# Cost while stopped:
#   EC2 + RDS compute: $0
#   EBS storage:       $2.40/month (always)
#   RDS storage:       ~$2.30/month (always)
#   Elastic IP:        $0.005/hr while EC2 stopped
#   Total:             ~$0.15/day while stopped
#
# Usage: ./scripts/stop.sh <env>
set -euo pipefail

ENV=${1:?Usage: stop.sh <env>}
AWS_PROFILE_NAME=${AWS_PROFILE:-fieldbrix}
export AWS_PROFILE="${AWS_PROFILE_NAME}"
REGION="ap-south-1"

echo ""
echo "=== Stopping Fieldbrix ${ENV} ==="

# Stop EC2
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-api" \
            "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text --region "${REGION}")

if [ "${INSTANCE_ID}" = "None" ] || [ -z "${INSTANCE_ID}" ]; then
  echo "EC2: already stopped"
else
  aws ec2 stop-instances --instance-ids "${INSTANCE_ID}" --region "${REGION}" > /dev/null
  echo "✓ EC2 stopping (${INSTANCE_ID})"
fi

# Stop RDS
DB_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "fieldbrix-${ENV}" \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text --region "${REGION}" 2>/dev/null || echo "not-found")

if [ "${DB_STATUS}" = "available" ]; then
  aws rds stop-db-instance --db-instance-identifier "fieldbrix-${ENV}" --region "${REGION}" > /dev/null
  echo "✓ RDS stopping (takes 2-3 min)"
elif [ "${DB_STATUS}" = "stopped" ]; then
  echo "RDS: already stopped"
else
  echo "RDS: ${DB_STATUS}"
fi

echo ""
python3 << 'PYEOF'
EC2_PER_HOUR  = 0.0224
RDS_PER_HOUR  = 0.017
EBS_PER_HOUR  = 0.0033
RDS_STOR_HOUR = 0.0032
EIP_STOPPED   = 0.005

running_hr = EC2_PER_HOUR + RDS_PER_HOUR + EBS_PER_HOUR + RDS_STOR_HOUR
stopped_hr = EBS_PER_HOUR + RDS_STOR_HOUR + EIP_STOPPED
saving_hr  = running_hr - stopped_hr

print(f"Cost now (stopped):   ${stopped_hr * 24:.2f}/day")
print(f"Saving vs running:    ${saving_hr:.4f}/hr  →  ${saving_hr * 10:.2f} saved over 10 hours")
print()
print("Your static IP is still allocated. DNS still works.")
print("RDS auto-restarts after 7 days if not manually started.")
print()
print("To start back up:")
print("  ./scripts/start.sh <env>   (takes ~3 minutes)")
PYEOF
