#!/usr/bin/env bash
set -euo pipefail

docker compose exec -T postgres psql -U "${POSTGRES_USER:-fieldbrix}" -d "${POSTGRES_DB:-fieldbrix}" \
  -f /docker-entrypoint-initdb.d/001-schema.sql
