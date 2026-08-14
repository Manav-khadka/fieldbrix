#!/usr/bin/env bash
# Validate all Terraform without reading remote state or requiring AWS credentials.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENVIRONMENT=${1:-prod}
ENV_DIR="${ROOT_DIR}/environments/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}" ]; then
  echo "Unknown environment: ${ENVIRONMENT}" >&2
  exit 1
fi

TF_PLUGIN_DIR=$(mktemp -d "${TMPDIR:-/tmp}/fieldbrix-terraform-validate.XXXXXX")
trap 'rm -rf "${TF_PLUGIN_DIR}"' EXIT

terraform -chdir="${ROOT_DIR}" fmt -check -recursive
TF_DATA_DIR="${TF_PLUGIN_DIR}" terraform -chdir="${ENV_DIR}" init \
  -backend=false \
  -input=false \
  -no-color
TF_DATA_DIR="${TF_PLUGIN_DIR}" terraform -chdir="${ENV_DIR}" validate -no-color

echo "Terraform formatting and validation passed for ${ENVIRONMENT}."
