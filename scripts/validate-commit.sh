#!/usr/bin/env bash
set -euo pipefail

MESSAGE=${1:-}
PATTERN='^(feat|fix|chore|refactor|test|docs|perf|ci|revert)(\([a-z0-9][a-z0-9-]*\))?!?: .+'

if [[ ! "${MESSAGE}" =~ ${PATTERN} ]]; then
  echo "Use Conventional Commits, for example: feat(api): add readiness adapter" >&2
  exit 1
fi
