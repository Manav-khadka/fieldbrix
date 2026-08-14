#!/usr/bin/env bash
set -euo pipefail

pnpm --dir fieldbrix-backend build
pnpm --dir fieldbrix-frontend build
(cd fieldbrix_app && flutter build web --release)
