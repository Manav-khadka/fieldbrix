#!/usr/bin/env bash
set -euo pipefail

./scripts/local/install.sh
docker compose up --build -d
./scripts/local/migrate.sh
./scripts/local/seed.sh
./scripts/local/health.sh
