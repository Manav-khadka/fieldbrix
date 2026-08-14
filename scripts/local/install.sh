#!/usr/bin/env bash
set -euo pipefail

pnpm --dir fieldbrix-backend install --frozen-lockfile
pnpm --dir fieldbrix-frontend install --frozen-lockfile
(cd fieldbrix_app && flutter pub get)
