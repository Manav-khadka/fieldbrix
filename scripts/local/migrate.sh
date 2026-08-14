#!/usr/bin/env bash
set -euo pipefail

for file in local/postgres/init/*.sql; do
  cat "$file" | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 \
    -U "${POSTGRES_USER:-fieldbrix}" -d "${POSTGRES_DB:-fieldbrix}" >/dev/null
done
