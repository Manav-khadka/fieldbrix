#!/usr/bin/env bash
# One-time setup: creates S3 bucket (state storage) + DynamoDB table (state lock).
# Run once per AWS account before any terraform commands.
set -euo pipefail

REGION="ap-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
STATE_BUCKET="fieldbrix-tfstate-${ACCOUNT_ID}"
LOCK_TABLE="fieldbrix-terraform-locks"

echo "Account:      ${ACCOUNT_ID}"
echo "Region:       ${REGION}"
echo "State bucket: ${STATE_BUCKET}"
echo ""

# S3 bucket for Terraform state
echo "→ Creating state S3 bucket..."
aws s3api create-bucket \
  --bucket "${STATE_BUCKET}" \
  --region "${REGION}" \
  --create-bucket-configuration LocationConstraint="${REGION}"

aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✓ S3 bucket ready"

# DynamoDB for state locking — provisioned mode = completely free
echo "→ Creating DynamoDB lock table (provisioned mode = free)..."
aws dynamodb create-table \
  --table-name "${LOCK_TABLE}" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --region "${REGION}"

echo "✓ DynamoDB lock table ready"
echo ""
echo "════════════════════════════════════════════"
echo "Now update environments/prod/backend.tf:"
echo ""
echo '  bucket         = "'${STATE_BUCKET}'"'
echo '  dynamodb_table = "'${LOCK_TABLE}'"'
echo '  region         = "'${REGION}'"'
echo "════════════════════════════════════════════"
