#!/usr/bin/env bash
set -euo pipefail

pnpm --dir fieldbrix-backend lint
pnpm --dir fieldbrix-backend typecheck
pnpm --dir fieldbrix-frontend lint
pnpm --dir fieldbrix-frontend typecheck
(cd fieldbrix_app && flutter analyze)
python3 -m compileall -q lambdas
