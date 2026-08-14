#!/usr/bin/env bash
set -euo pipefail

curl --fail --silent http://localhost:${API_PORT:-3000}/health/live >/dev/null
curl --fail --silent http://localhost:${API_PORT:-3000}/health/ready >/dev/null
curl --fail --silent http://localhost:${WEB_PORT:-5173}/ >/dev/null
docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-fieldbrix}" -d "${POSTGRES_DB:-fieldbrix}" >/dev/null
docker compose exec -T localstack awslocal s3api head-bucket --bucket fieldbrix-local-uploads
docker compose exec -T localstack awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/fieldbrix-local-jobs \
  --attribute-names QueueArn >/dev/null
printf '%s\n' 'Local FieldBrix health checks passed.'
