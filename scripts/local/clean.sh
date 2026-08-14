#!/usr/bin/env bash
set -euo pipefail

# This project name is explicit so cleanup cannot target unrelated Docker data.
docker compose -p fieldbrix down --volumes --remove-orphans
