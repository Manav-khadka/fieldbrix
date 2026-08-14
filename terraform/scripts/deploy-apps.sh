#!/usr/bin/env bash
# Build and deploy React + NestJS through S3 and AWS Systems Manager.
# Usage: ./terraform/scripts/deploy-apps.sh [env]
set -euo pipefail

DEPLOY_ENV=${1:-prod}
AWS_PROFILE_NAME=${AWS_PROFILE:-}
AWS_REGION_NAME=${AWS_REGION:-ap-south-1}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${ROOT_DIR}/terraform/environments/${DEPLOY_ENV}"

BACKEND_DIR=${FIELDBRIX_BACKEND_DIR:-${ROOT_DIR}/apps/backend}
FRONTEND_DIR=${FIELDBRIX_FRONTEND_DIR:-${ROOT_DIR}/apps/frontend}

for command_name in aws curl git jq pnpm tar terraform; do
  command -v "${command_name}" >/dev/null || {
    echo "Missing required command: ${command_name}" >&2
    exit 1
  }
done

for required_file in \
  "${BACKEND_DIR}/package.json" \
  "${FRONTEND_DIR}/package.json" \
  "${TF_DIR}/backend.tf"; do
  test -f "${required_file}" || {
    echo "Missing required file: ${required_file}" >&2
    exit 1
  }
done

COMMIT_SHA=${RELEASE_COMMIT_SHA:-${GITHUB_SHA:-$(git -C "${ROOT_DIR}" rev-parse HEAD)}}
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
RELEASE_ID="${COMMIT_SHA:0:12}-$(date -u +%Y%m%dT%H%M%SZ)"
APP_VERSION=$(jq -r .version "${BACKEND_DIR}/package.json")
ARTIFACT_DIR=$(mktemp -d "${TMPDIR:-/tmp}/fieldbrix-release.XXXXXX")

cleanup() {
  find "${ARTIFACT_DIR}" -mindepth 1 -delete
  rmdir "${ARTIFACT_DIR}"
}
trap cleanup EXIT

run_terraform() {
  if [ -n "${AWS_PROFILE_NAME}" ]; then
    AWS_PROFILE="${AWS_PROFILE_NAME}" terraform "$@"
  else
    terraform "$@"
  fi
}

AWS_OPTIONS=(--region "${AWS_REGION_NAME}")
if [ -n "${AWS_PROFILE_NAME}" ]; then
  AWS_OPTIONS+=(--profile "${AWS_PROFILE_NAME}")
fi

INSTANCE_ID=$(run_terraform -chdir="${TF_DIR}" output -raw instance_id)
DEPLOYMENT_BUCKET=$(run_terraform -chdir="${TF_DIR}" output -raw web_bucket)
ADMIN_URL=$(run_terraform -chdir="${TF_DIR}" output -raw admin_url)
API_URL=$(run_terraform -chdir="${TF_DIR}" output -raw api_url)

pnpm --dir "${BACKEND_DIR}" install --frozen-lockfile
pnpm --dir "${FRONTEND_DIR}" install --frozen-lockfile

pnpm --dir "${BACKEND_DIR}" exec eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0
pnpm --dir "${BACKEND_DIR}" exec tsc --noEmit
pnpm --dir "${BACKEND_DIR}" test --runInBand
pnpm --dir "${BACKEND_DIR}" test:e2e --runInBand
pnpm --dir "${BACKEND_DIR}" build

pnpm --dir "${FRONTEND_DIR}" lint
VITE_API_BASE_URL="${API_URL}" VITE_APP_VERSION="${COMMIT_SHA}" \
  pnpm --dir "${FRONTEND_DIR}" build

tar -czf "${ARTIFACT_DIR}/api.tar.gz" \
  -C "${BACKEND_DIR}" dist package.json pnpm-lock.yaml
tar -czf "${ARTIFACT_DIR}/admin.tar.gz" -C "${FRONTEND_DIR}/dist" .

for artifact in api.tar.gz admin.tar.gz; do
  aws s3 cp "${ARTIFACT_DIR}/${artifact}" \
    "s3://${DEPLOYMENT_BUCKET}/releases/${RELEASE_ID}/${artifact}" \
    --only-show-errors "${AWS_OPTIONS[@]}"
done

PARAMETERS=$(jq -cn \
  --arg release "${RELEASE_ID}" \
  --arg bucket "${DEPLOYMENT_BUCKET}" \
  --arg region "${AWS_REGION_NAME}" \
  --arg version "${APP_VERSION}" \
  --arg commit "${COMMIT_SHA}" \
  --arg buildTime "${BUILD_TIME}" \
  '{commands:[
    "set -euo pipefail",
    ("release=" + $release),
    ("bucket=" + $bucket),
    ("region=" + $region),
    "install -d /opt/fieldbrix/admin/releases/$release /opt/fieldbrix/backend/releases/$release",
    "aws s3 cp s3://$bucket/releases/$release/admin.tar.gz /tmp/admin.tar.gz --region $region --only-show-errors",
    "aws s3 cp s3://$bucket/releases/$release/api.tar.gz /tmp/api.tar.gz --region $region --only-show-errors",
    "tar -xzf /tmp/admin.tar.gz -C /opt/fieldbrix/admin/releases/$release",
    "tar -xzf /tmp/api.tar.gz -C /opt/fieldbrix/backend/releases/$release",
    ("printf \"%s\\n\" \"APP_VERSION=" + $version + "\" \"APP_COMMIT_SHA=" + $commit + "\" \"APP_BUILD_TIME=" + $buildTime + "\" > /opt/fieldbrix/backend/releases/$release/release.env"),
    "chown -R ec2-user:ec2-user /opt/fieldbrix/admin/releases/$release /opt/fieldbrix/backend/releases/$release",
    "cd /opt/fieldbrix/backend/releases/$release && sudo -u ec2-user /usr/bin/pnpm install --prod --frozen-lockfile",
    "install -d /etc/systemd/system/fieldbrix-api.service.d",
    "printf \"%s\\n\" \"[Service]\" \"EnvironmentFile=-/opt/fieldbrix/backend/current/release.env\" > /etc/systemd/system/fieldbrix-api.service.d/release.conf",
    "if [ -e /var/www/fieldbrix-admin ] && [ ! -L /var/www/fieldbrix-admin ]; then mv /var/www/fieldbrix-admin /var/www/fieldbrix-admin-bootstrap; fi",
    "ln -sfn /opt/fieldbrix/admin/releases/$release /var/www/fieldbrix-admin",
    "ln -sfn /opt/fieldbrix/backend/releases/$release /opt/fieldbrix/backend/current",
    "systemctl daemon-reload && systemctl restart fieldbrix-api.service",
    "nginx -t && systemctl reload nginx",
    "sleep 3",
    "curl --fail http://127.0.0.1:3000/health/live",
    "curl --fail http://127.0.0.1:3000/health/ready"
  ]}')

COMMAND_ID=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name AWS-RunShellScript \
  --parameters "${PARAMETERS}" \
  --query 'Command.CommandId' \
  --output text "${AWS_OPTIONS[@]}")

aws ssm wait command-executed \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  "${AWS_OPTIONS[@]}"

curl --fail --silent "${ADMIN_URL}" >/dev/null
curl --fail --silent "${API_URL}/health/ready" >/dev/null
curl --fail --silent "${API_URL}/version" | \
  jq -e --arg sha "${COMMIT_SHA}" '.commitSha == $sha' >/dev/null

echo "Deployment ${RELEASE_ID} succeeded."
