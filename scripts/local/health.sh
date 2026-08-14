#!/usr/bin/env bash
set -euo pipefail

wait_for_http() {
  local url=$1
  local attempts=${2:-30}

  for _ in $(seq 1 "${attempts}"); do
    if curl --fail --silent --max-time 2 "${url}" >/dev/null; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for ${url}" >&2
  return 1
}

wait_for_http http://localhost:${API_PORT:-3000}/health/live
wait_for_http http://localhost:${API_PORT:-3000}/health/ready
wait_for_http http://localhost:${WEB_PORT:-5173}/
docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-fieldbrix}" -d "${POSTGRES_DB:-fieldbrix}" >/dev/null
docker compose exec -T localstack awslocal s3api head-bucket --bucket fieldbrix-local-uploads
docker compose exec -T localstack awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/fieldbrix-local-jobs \
  --attribute-names QueueArn >/dev/null
printf '%s\n' 'Local FieldBrix health checks passed.'
