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

BACKEND_DIR=${FIELDBRIX_BACKEND_DIR:-${ROOT_DIR}/fieldbrix-backend}
FRONTEND_DIR=${FIELDBRIX_FRONTEND_DIR:-${ROOT_DIR}/fieldbrix-frontend}
BACKEND_SENTRY_DSN=${BACKEND_SENTRY_DSN:-}
PLATFORM_ADMIN_TOKEN=${PLATFORM_ADMIN_TOKEN:-platform-admin-prod-token}
PLATFORM_ADMIN_REAUTH=${PLATFORM_ADMIN_REAUTH:-platform-admin-prod-reauth}

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
APPLICATION_BUCKET=$(run_terraform -chdir="${TF_DIR}" output -raw photos_bucket)
APPLICATION_QUEUE_URL=$(run_terraform -chdir="${TF_DIR}" output -json queue_urls | jq -r '.media')

pnpm --dir "${BACKEND_DIR}" install --frozen-lockfile
pnpm --dir "${FRONTEND_DIR}" install --frozen-lockfile

pnpm --dir "${BACKEND_DIR}" exec eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0
pnpm --dir "${BACKEND_DIR}" exec tsc --noEmit
pnpm --dir "${BACKEND_DIR}" test --runInBand
# pnpm --dir "${BACKEND_DIR}" test:e2e --runInBand
pnpm --dir "${BACKEND_DIR}" build

pnpm --dir "${FRONTEND_DIR}" lint
VITE_API_BASE_URL="${API_URL}" VITE_APP_VERSION="${COMMIT_SHA}" \
  VITE_SENTRY_DSN="${WEB_SENTRY_DSN:-}" \
  VITE_SENTRY_RELEASE="fieldbrix-web@${COMMIT_SHA}" \
  pnpm --dir "${FRONTEND_DIR}" build

if [[ -n "${SENTRY_AUTH_TOKEN:-}" ]]; then
  : "${SENTRY_ORG:?SENTRY_ORG is required when SENTRY_AUTH_TOKEN is set}"
  : "${SENTRY_WEB_PROJECT:?SENTRY_WEB_PROJECT is required when SENTRY_AUTH_TOKEN is set}"
  : "${SENTRY_BACKEND_PROJECT:?SENTRY_BACKEND_PROJECT is required when SENTRY_AUTH_TOKEN is set}"
  SENTRY_CLI=(pnpm --dir "${FRONTEND_DIR}" dlx @sentry/cli@3.6.2)
  "${SENTRY_CLI[@]}" releases new "fieldbrix-web@${COMMIT_SHA}"
  "${SENTRY_CLI[@]}" sourcemaps inject "${FRONTEND_DIR}/dist"
  "${SENTRY_CLI[@]}" sourcemaps upload --release "fieldbrix-web@${COMMIT_SHA}" \
    --org "${SENTRY_ORG}" --project "${SENTRY_WEB_PROJECT}" "${FRONTEND_DIR}/dist"
  "${SENTRY_CLI[@]}" releases new "fieldbrix-backend@${COMMIT_SHA}"
  "${SENTRY_CLI[@]}" sourcemaps upload --release "fieldbrix-backend@${COMMIT_SHA}" \
    --org "${SENTRY_ORG}" --project "${SENTRY_BACKEND_PROJECT}" "${BACKEND_DIR}/dist"
fi

tar -czf "${ARTIFACT_DIR}/api.tar.gz" \
  --exclude='*.map' -C "${BACKEND_DIR}" dist package.json pnpm-lock.yaml
tar -czf "${ARTIFACT_DIR}/admin.tar.gz" --exclude='*.map' -C "${FRONTEND_DIR}/dist" .
tar -czf "${ARTIFACT_DIR}/migrations.tar.gz" -C "${ROOT_DIR}/local/postgres" init

for artifact in api.tar.gz admin.tar.gz migrations.tar.gz; do
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
  --arg sentryDsn "${BACKEND_SENTRY_DSN}" \
  --arg applicationBucket "${APPLICATION_BUCKET}" \
  --arg applicationQueueUrl "${APPLICATION_QUEUE_URL}" \
  --arg platformAdminToken "${PLATFORM_ADMIN_TOKEN}" \
  --arg platformAdminReauth "${PLATFORM_ADMIN_REAUTH}" \
  --arg adminOrigin "${ADMIN_URL}" \
  '{commands:[
    "set -euo pipefail",
    ("release=" + $release),
    ("bucket=" + $bucket),
    ("region=" + $region),
    "install -d /opt/fieldbrix/admin/releases/$release /opt/fieldbrix/backend/releases/$release",
    "aws s3 cp s3://$bucket/releases/$release/admin.tar.gz /tmp/admin.tar.gz --region $region --only-show-errors",
    "aws s3 cp s3://$bucket/releases/$release/api.tar.gz /tmp/api.tar.gz --region $region --only-show-errors",
    "aws s3 cp s3://$bucket/releases/$release/migrations.tar.gz /tmp/migrations.tar.gz --region $region --only-show-errors",
    "tar -xzf /tmp/admin.tar.gz -C /opt/fieldbrix/admin/releases/$release",
    "tar -xzf /tmp/api.tar.gz -C /opt/fieldbrix/backend/releases/$release",
    "install -d /opt/fieldbrix/backend/releases/$release/migrations",
    "tar -xzf /tmp/migrations.tar.gz -C /opt/fieldbrix/backend/releases/$release/migrations",
    "DB_HOST=$(grep \"^DB_HOST=\" /etc/fieldbrix/backend.env | cut -d= -f2-)",
    "DB_PORT=$(grep \"^DB_PORT=\" /etc/fieldbrix/backend.env | cut -d= -f2-)",
    "DB_NAME=$(grep \"^DB_NAME=\" /etc/fieldbrix/backend.env | cut -d= -f2-)",
    "DB_USER=$(grep \"^DB_USER=\" /etc/fieldbrix/backend.env | cut -d= -f2-)",
    "DB_PASS_B64=$(grep \"^DB_PASSWORD_B64=\" /etc/fieldbrix/backend.env | cut -d= -f2-)",
    "DB_PASS=$(printf \"%s\" \"$DB_PASS_B64\" | base64 -d)",
    "for f in $(ls /opt/fieldbrix/backend/releases/$release/migrations/init/*.sql | sort); do echo \"Running migration $(basename $f)...\"; PGPASSWORD=\"$DB_PASS\" psql -h \"$DB_HOST\" -p \"$DB_PORT\" -U \"$DB_USER\" -d \"$DB_NAME\" -v ON_ERROR_STOP=0 -f \"$f\" || true; done",
    ("printf \"%s\\n\" \"APP_VERSION=" + $version + "\" \"APP_COMMIT_SHA=" + $commit + "\" \"APP_BUILD_TIME=" + $buildTime + "\" \"SENTRY_RELEASE=fieldbrix-backend@" + $commit + "\" \"SENTRY_DSN=" + $sentryDsn + "\" \"S3_BUCKET=" + $applicationBucket + "\" \"SQS_QUEUE_URL=" + $applicationQueueUrl + "\" \"PLATFORM_ADMIN_TOKEN=" + $platformAdminToken + "\" \"PLATFORM_ADMIN_REAUTH=" + $platformAdminReauth + "\" \"ADMIN_ORIGIN=" + $adminOrigin + "\" > /opt/fieldbrix/backend/releases/$release/release.env"),
    "chown -R ec2-user:ec2-user /opt/fieldbrix/admin/releases/$release /opt/fieldbrix/backend/releases/$release",
    "PNPM_BIN=$(command -v /usr/local/bin/pnpm || command -v /usr/bin/pnpm || command -v pnpm || echo pnpm)",
    "cd /opt/fieldbrix/backend/releases/$release && sudo -u ec2-user env PATH=\"$PATH:/usr/local/bin:/usr/bin\" $PNPM_BIN install --prod --frozen-lockfile",
    "install -d /etc/systemd/system/fieldbrix-api.service.d",
    "printf \"%s\\n\" \"[Service]\" \"EnvironmentFile=-/opt/fieldbrix/backend/current/release.env\" > /etc/systemd/system/fieldbrix-api.service.d/release.conf",
    "if [ -e /var/www/fieldbrix-admin ] && [ ! -L /var/www/fieldbrix-admin ]; then mv /var/www/fieldbrix-admin /var/www/fieldbrix-admin-bootstrap; fi",
    "ln -sfn /opt/fieldbrix/admin/releases/$release /var/www/fieldbrix-admin",
    "ln -sfn /opt/fieldbrix/backend/releases/$release /opt/fieldbrix/backend/current",
    "systemctl daemon-reload && systemctl restart fieldbrix-api.service",
    "nginx -t && systemctl reload nginx",
    "for i in $(seq 1 30); do if curl -s --fail http://127.0.0.1:3000/health/ready >/dev/null; then echo \"Backend ready!\"; break; fi; echo \"Waiting for backend...\"; sleep 2; done",
    "if ! curl --fail http://127.0.0.1:3000/health/ready; then echo \"Backend failed to start. Service logs:\"; journalctl -u fieldbrix-api.service -n 100 --no-pager; exit 1; fi"
  ]}')

COMMAND_ID=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name AWS-RunShellScript \
  --parameters "${PARAMETERS}" \
  --query 'Command.CommandId' \
  --output text "${AWS_OPTIONS[@]}")

if ! aws ssm wait command-executed \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  "${AWS_OPTIONS[@]}"; then
  echo "SSM command execution failed. Detailed output from EC2:" >&2
  aws ssm get-command-invocation \
    --command-id "${COMMAND_ID}" \
    --instance-id "${INSTANCE_ID}" \
    "${AWS_OPTIONS[@]}" >&2 || true
  exit 1
fi

echo "Verifying public endpoints..."
for i in $(seq 1 15); do
  if curl --fail --silent "${ADMIN_URL}" >/dev/null && \
     curl --fail --silent "${API_URL}/health/ready" >/dev/null; then
    echo "Public endpoints responding successfully."
    break
  fi
  echo "Waiting for public endpoints to respond..."
  sleep 3
done

curl --fail --silent "${ADMIN_URL}" >/dev/null
curl --fail --silent "${API_URL}/health/ready" >/dev/null
curl --fail --silent "${API_URL}/version" | \
  jq -e --arg sha "${COMMIT_SHA}" '(.data // .).commitSha == $sha' >/dev/null

echo "Deployment ${RELEASE_ID} succeeded."
