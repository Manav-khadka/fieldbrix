#!/usr/bin/env bash
set -euo pipefail

pnpm --dir fieldbrix-backend test --runInBand
pnpm --dir fieldbrix-backend test:e2e --runInBand
pnpm --dir fieldbrix-frontend build
(cd fieldbrix_app && flutter test)
if find lambdas -type f -name '*_test.py' -print -quit | grep -q .; then
  python3 -m unittest discover -s lambdas -p '*_test.py'
else
  printf '%s\n' 'No Python worker tests found; skipping worker test discovery.'
fi
