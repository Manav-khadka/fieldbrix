#!/usr/bin/env bash
# Build and deploy the React admin and NestJS API through S3 + AWS SSM.
# Usage: ./scripts/deploy-apps.sh [env]
set -euo pipefail

DEPLOY_ENV=${1:-prod}
AWS_PROFILE_NAME=${AWS_PROFILE:-fieldbrix}
AWS_REGION_NAME=${AWS_REGION:-ap-south-1}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TF_DIR="${SCRIPT_DIR}/../environments/${DEPLOY_ENV}"
FRONTEND_DIR="${REPO_ROOT}/fieldbrix-frontend"
BACKEND_DIR="${REPO_ROOT}/fieldbrix-backend"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
ARTIFACT_DIR="$(mktemp -d /tmp/fieldbrix-release.XXXXXX)"

cleanup() {
  case "${ARTIFACT_DIR}" in
    /tmp/fieldbrix-release.*)
      find "${ARTIFACT_DIR}" -mindepth 1 -delete
      rmdir "${ARTIFACT_DIR}"
      ;;
  esac
}
trap cleanup EXIT

for command_name in aws jq pnpm tar terraform; do
  command -v "${command_name}" >/dev/null || {
    echo "Missing required command: ${command_name}" >&2
    exit 1
  }
done

AWS_PROFILE="${AWS_PROFILE_NAME}" terraform -chdir="${TF_DIR}" output >/dev/null
INSTANCE_ID="$(AWS_PROFILE="${AWS_PROFILE_NAME}" terraform -chdir="${TF_DIR}" output -raw instance_id)"
STATIC_IP="$(AWS_PROFILE="${AWS_PROFILE_NAME}" terraform -chdir="${TF_DIR}" output -raw static_ip)"
DEPLOYMENT_BUCKET="$(AWS_PROFILE="${AWS_PROFILE_NAME}" terraform -chdir="${TF_DIR}" output -raw web_bucket)"

pnpm --dir "${FRONTEND_DIR}" build
pnpm --dir "${FRONTEND_DIR}" lint
pnpm --dir "${BACKEND_DIR}" build
pnpm --dir "${BACKEND_DIR}" test --runInBand
pnpm --dir "${BACKEND_DIR}" test:e2e --runInBand

COPYFILE_DISABLE=1 tar -czf "${ARTIFACT_DIR}/admin.tar.gz" -C "${FRONTEND_DIR}/dist" .
COPYFILE_DISABLE=1 tar -czf "${ARTIFACT_DIR}/api.tar.gz" \
  -C "${BACKEND_DIR}" dist package.json pnpm-lock.yaml

RELEASE_PREFIX="releases/${RELEASE_ID}"
aws s3 cp "${ARTIFACT_DIR}/admin.tar.gz" \
  "s3://${DEPLOYMENT_BUCKET}/${RELEASE_PREFIX}/admin.tar.gz" \
  --profile "${AWS_PROFILE_NAME}" --region "${AWS_REGION_NAME}" --only-show-errors
aws s3 cp "${ARTIFACT_DIR}/api.tar.gz" \
  "s3://${DEPLOYMENT_BUCKET}/${RELEASE_PREFIX}/api.tar.gz" \
  --profile "${AWS_PROFILE_NAME}" --region "${AWS_REGION_NAME}" --only-show-errors

PARAMETERS="$(jq -cn \
  --arg release "${RELEASE_ID}" \
  --arg bucket "${DEPLOYMENT_BUCKET}" \
  --arg region "${AWS_REGION_NAME}" \
  '{commands:[
    "set -euo pipefail",
    ("release=" + $release),
    ("bucket=" + $bucket),
    ("region=" + $region),
    "install -d -m 0755 /opt/fieldbrix/admin/releases/$release /opt/fieldbrix/backend/releases/$release",
    "aws s3 cp s3://$bucket/releases/$release/admin.tar.gz /tmp/fieldbrix-admin-$release.tar.gz --region $region --only-show-errors",
    "aws s3 cp s3://$bucket/releases/$release/api.tar.gz /tmp/fieldbrix-api-$release.tar.gz --region $region --only-show-errors",
    "tar -xzf /tmp/fieldbrix-admin-$release.tar.gz -C /opt/fieldbrix/admin/releases/$release",
    "tar -xzf /tmp/fieldbrix-api-$release.tar.gz -C /opt/fieldbrix/backend/releases/$release",
    "chown -R ec2-user:ec2-user /opt/fieldbrix/admin/releases/$release /opt/fieldbrix/backend/releases/$release",
    "cd /opt/fieldbrix/backend/releases/$release && sudo -u ec2-user /usr/bin/pnpm install --prod --frozen-lockfile",
    "test -L /var/www/fieldbrix-admin || mv /var/www/fieldbrix-admin /var/www/fieldbrix-admin-bootstrap",
    "ln -sfn /opt/fieldbrix/admin/releases/$release /var/www/fieldbrix-admin",
    "ln -sfn /opt/fieldbrix/backend/releases/$release /opt/fieldbrix/backend/current",
    "systemctl restart fieldbrix-api.service",
    "nginx -t",
    "systemctl reload nginx",
    "sleep 3",
    "curl --fail --silent --show-error http://127.0.0.1:3000/health/live",
    "curl --fail --silent --show-error http://127.0.0.1:3000/health/ready"
  ]}')"

COMMAND_ID="$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name AWS-RunShellScript \
  --comment "Deploy FieldBrix release ${RELEASE_ID}" \
  --parameters "${PARAMETERS}" \
  --profile "${AWS_PROFILE_NAME}" \
  --region "${AWS_REGION_NAME}" \
  --query 'Command.CommandId' \
  --output text)"

if ! aws ssm wait command-executed \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --profile "${AWS_PROFILE_NAME}" \
  --region "${AWS_REGION_NAME}"; then
  aws ssm get-command-invocation \
    --command-id "${COMMAND_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --profile "${AWS_PROFILE_NAME}" \
    --region "${AWS_REGION_NAME}"
  exit 1
fi

echo "Deployment ${RELEASE_ID} succeeded."
echo "Static IP: ${STATIC_IP}"
echo "Admin: https://admin.fieldbrix.com"
echo "API:   https://api.fieldbrix.com/health/ready"
