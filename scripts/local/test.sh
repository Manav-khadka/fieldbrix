#!/usr/bin/env bash
set -euo pipefail

pnpm --dir fieldbrix-backend test --runInBand
pnpm --dir fieldbrix-backend test:e2e --runInBand
pnpm --dir fieldbrix-frontend build
(cd fieldbrix_app && flutter test)
python3 -m unittest discover -s lambdas -p '*_test.py'
