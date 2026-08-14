#!/usr/bin/env bash
# Show current state of all infrastructure and estimated running cost.
# Usage: ./scripts/status.sh <env>
set -euo pipefail

ENV=${1:?Usage: status.sh <env>}
AWS_PROFILE_NAME=${AWS_PROFILE:-fieldbrix}
export AWS_PROFILE="${AWS_PROFILE_NAME}"
REGION="ap-south-1"

echo ""
echo "=== Fieldbrix ${ENV} — Current Status ==="
echo ""

# EC2
EC2_INFO=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-api" \
  --query "Reservations[0].Instances[0].{State:State.Name,Type:InstanceType,IP:PublicIpAddress}" \
  --output json --region "${REGION}" 2>/dev/null)

EC2_STATE=$(echo "${EC2_INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('State','unknown'))" 2>/dev/null || echo "not found")
EC2_IP=$(echo "${EC2_INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('IP') or 'none')" 2>/dev/null || echo "")
echo "EC2 t4g.small:     ${EC2_STATE} ${EC2_IP:+(IP: $EC2_IP)}"

# EIP
EIP_IP=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-eip" \
  --query "Addresses[0].PublicIp" \
  --output text --region "${REGION}" 2>/dev/null || echo "none")
echo "Elastic IP:        ${EIP_IP} (stable across EC2 stop/start)"

# RDS
RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "fieldbrix-${ENV}" \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text --region "${REGION}" 2>/dev/null || echo "not found")
echo "RDS db.t4g.micro:  ${RDS_STATUS}"

# S3 buckets
BUCKETS=$(aws s3api list-buckets \
  --query "Buckets[?starts_with(Name, 'fieldbrix-${ENV}')].Name" \
  --output text 2>/dev/null | tr '\t' ' ')
echo "S3 buckets:        $(echo $BUCKETS | wc -w | tr -d ' ') buckets (${BUCKETS})"

echo ""
echo "--- Estimated Cost ---"
if [ "${EC2_STATE}" = "running" ] && [ "${RDS_STATUS}" = "available" ]; then
  echo "Current:   ~\$1.04/day (both running)"
  echo "Per month: ~\$31/month"
  echo ""
  echo "Tip: Run ./scripts/stop.sh ${ENV} before sleeping"
  echo "     Saves ~\$0.47/night (10 hours)"
elif [ "${EC2_STATE}" = "stopped" ] && [ "${RDS_STATUS}" = "stopped" ]; then
  echo "Current:   ~\$0.15/day (both stopped)"
  echo "  EBS storage:     \$0.08/day"
  echo "  EIP (stopped):   \$0.12/day"
  echo "  RDS storage:     ~\$0.08/day"
  echo ""
  echo "Run ./scripts/start.sh ${ENV} to start"
else
  echo "Mixed state — run start.sh or stop.sh to normalize"
fi
echo ""
