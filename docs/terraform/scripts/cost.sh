#!/usr/bin/env bash
# Shows exact cost breakdown — running vs stopped — and credit runway.
# Usage: ./scripts/cost.sh [env]
set -euo pipefail

ENV=${1:-prod}
REGION="ap-south-1"

echo ""
echo "=== Fieldbrix Cost Calculator ==="
echo ""

# ── Get current state ─────────────────────────────────────────────────────

EC2_STATE=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=fieldbrix-${ENV}-api" \
  --query "Reservations[0].Instances[0].State.Name" \
  --output text --region "${REGION}" 2>/dev/null || echo "not-found")

RDS_STATE=$(aws rds describe-db-instances \
  --db-instance-identifier "fieldbrix-${ENV}" \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text --region "${REGION}" 2>/dev/null || echo "not-found")

echo "Current state:"
echo "  EC2:  ${EC2_STATE}"
echo "  RDS:  ${RDS_STATE}"
echo ""

# ── Cost breakdown ────────────────────────────────────────────────────────

python3 << 'PYEOF'
# All prices in USD/hour — ap-south-1 on-demand August 2026

EC2_PER_HOUR   = 0.0224   # t4g.medium
RDS_PER_HOUR   = 0.017    # db.t3.micro
EBS_PER_HOUR   = 0.0033   # 30GB gp3 ($2.40/month ÷ 730hrs)
RDS_STOR_HOUR  = 0.0032   # 20GB RDS storage ($2.30/month ÷ 730hrs)
EIP_STOPPED    = 0.005    # Elastic IP when EC2 is stopped (free when running)
CLOUDWATCH     = 0.0      # free tier covers us
SQS_LAMBDA     = 0.0      # always free tier
CREDITS        = 200.0

# Running cost (per hour)
running_hr = EC2_PER_HOUR + RDS_PER_HOUR + EBS_PER_HOUR + RDS_STOR_HOUR
running_day = running_hr * 24
running_month = running_day * 30

# Stopped cost (per hour)
stopped_hr = EBS_PER_HOUR + RDS_STOR_HOUR + EIP_STOPPED
stopped_day = stopped_hr * 24
stopped_month = stopped_day * 30

# Savings
savings_hr  = running_hr - stopped_hr
savings_8h  = savings_hr * 8     # one night (8hrs)
savings_10h = savings_hr * 10    # one night (10hrs)
savings_12h = savings_hr * 12    # one night (12hrs)
savings_week_nights_8h  = savings_8h  * 5 + stopped_day * 2   # 5 nightly stops + full weekend
savings_week_nights_10h = savings_10h * 5 + stopped_day * 2
savings_week_nights_12h = savings_12h * 5 + stopped_day * 2
monthly_stop_nights_10h  = running_month - (savings_10h * 5 * 4 + stopped_day * 8)
monthly_stop_wknds_10h   = running_month - (savings_10h * 22 + stopped_day * 8)   # rough

runway_always    = CREDITS / running_month
runway_nightly   = CREDITS / max(running_month - savings_10h * 22, 1)
runway_wknds     = CREDITS / max(running_month - savings_10h * 22 - stopped_day * 8, 1)

sep = "─" * 50

print("HOURLY COSTS")
print(sep)
print(f"  EC2 t4g.medium (running):   ${EC2_PER_HOUR:.4f}/hr")
print(f"  RDS db.t3.micro (running):  ${RDS_PER_HOUR:.4f}/hr")
print(f"  EBS 30GB gp3 (always):      ${EBS_PER_HOUR:.4f}/hr")
print(f"  RDS storage (always):       ${RDS_STOR_HOUR:.4f}/hr")
print(f"  Elastic IP (stopped only):  ${EIP_STOPPED:.4f}/hr  ← free when EC2 running")
print()
print("DAILY / MONTHLY COST")
print(sep)
print(f"  Running 24hrs:   ${running_day:.2f}/day   →  ${running_month:.2f}/month")
print(f"  Stopped 24hrs:   ${stopped_day:.2f}/day   →  ${stopped_month:.2f}/month")
print(f"  Saving per hour: ${savings_hr:.4f}/hr")
print()
print("IF YOU STOP TONIGHT")
print(sep)
print(f"  Stop for  8 hours:  saves  ${savings_8h:.2f}")
print(f"  Stop for 10 hours:  saves  ${savings_10h:.2f}")
print(f"  Stop for 12 hours:  saves  ${savings_12h:.2f}")
print()
print("MONTHLY SAVINGS (stop every weeknight 10hrs + full weekends)")
print(sep)
nightly_month_cost  = running_month - (savings_10h * 22)
full_stop_month     = running_month - (savings_10h * 22) - (stopped_day * 8)
print(f"  Always on:              ${running_month:.2f}/month")
print(f"  Stop nightly (10hrs):   ~${nightly_month_cost:.2f}/month   saves ~${running_month - nightly_month_cost:.2f}/month")
print(f"  Stop + weekends:        ~${full_stop_month:.2f}/month    saves ~${running_month - full_stop_month:.2f}/month")
print()
print(f"CREDIT RUNWAY  (starting from $200)")
print(sep)
print(f"  Always on:              ${CREDITS:.0f} ÷ ${running_month:.2f} = {runway_always:.1f} months")
print(f"  Stop nightly (10hrs):   ${CREDITS:.0f} ÷ ~${nightly_month_cost:.2f} = ~{CREDITS/nightly_month_cost:.1f} months")
print(f"  Stop + weekends:        ${CREDITS:.0f} ÷ ~${full_stop_month:.2f} = ~{CREDITS/full_stop_month:.1f} months")
print()
print("QUICK REFERENCE")
print(sep)
print(f"  Before bed:  ./scripts/stop.sh {ENV}    saves ~${savings_10h:.2f} tonight")
print(f"  Morning:     ./scripts/start.sh {ENV}   ready in ~3 minutes")
print(f"  Check state: ./scripts/status.sh {ENV}")
print()
PYEOF
