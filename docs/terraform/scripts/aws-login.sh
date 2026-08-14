#!/usr/bin/env bash
# Verify the local AWS profile and obtain temporary SSO/STS credentials when needed.
# Usage: AWS_PROFILE=fieldbrix ./scripts/aws-login.sh
set -euo pipefail

PROFILE="${AWS_PROFILE:-fieldbrix}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
EXPECTED_ACCOUNT="${AWS_ACCOUNT_ID:-}"
EXPECTED_ROLE="${AWS_EXPECTED_ROLE_NAME:-}"

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI v2 is required. On macOS: brew install awscli" >&2
  exit 1
fi

if ! aws configure list-profiles | grep -Fxq "${PROFILE}"; then
  echo "AWS profile '${PROFILE}' does not exist." >&2
  echo "Create it with: aws configure sso --profile ${PROFILE}" >&2
  exit 1
fi

identity() {
  aws sts get-caller-identity \
    --profile "${PROFILE}" \
    --region "${REGION}" \
    --query '[Account,Arn]' \
    --output text
}

if ! IDENTITY="$(identity 2>/dev/null)"; then
  SSO_SESSION="$(aws configure get sso_session --profile "${PROFILE}" 2>/dev/null || true)"
  SSO_START_URL="$(aws configure get sso_start_url --profile "${PROFILE}" 2>/dev/null || true)"

  if [[ -z "${SSO_SESSION}" && -z "${SSO_START_URL}" ]]; then
    echo "Profile '${PROFILE}' is not an SSO profile and its credentials failed." >&2
    echo "Reconfigure it with: aws configure sso --profile ${PROFILE}" >&2
    exit 1
  fi

  echo "AWS SSO session is missing or expired; opening login..."
  aws sso login --profile "${PROFILE}"
  IDENTITY="$(identity)"
fi

ACCOUNT_ID="${IDENTITY%%$'\t'*}"
CALLER_ARN="${IDENTITY#*$'\t'}"

if [[ -n "${EXPECTED_ACCOUNT}" && "${ACCOUNT_ID}" != "${EXPECTED_ACCOUNT}" ]]; then
  echo "AWS account mismatch: expected ${EXPECTED_ACCOUNT}, got ${ACCOUNT_ID}." >&2
  exit 1
fi

if [[ -n "${EXPECTED_ROLE}" && "${CALLER_ARN}" != *"${EXPECTED_ROLE}"* ]]; then
  echo "AWS role mismatch: expected a role containing '${EXPECTED_ROLE}'." >&2
  echo "Actual caller: ${CALLER_ARN}" >&2
  exit 1
fi

echo "AWS authentication ready"
echo "  Profile: ${PROFILE}"
echo "  Region:  ${REGION}"
echo "  Account: ${ACCOUNT_ID}"
echo "  Caller:  ${CALLER_ARN}"

if [[ "${CALLER_ARN}" == *":user/"* ]]; then
  echo "WARNING: this is an IAM user, not a temporary STS assumed role." >&2
  echo "Prefer: aws configure sso --profile ${PROFILE}" >&2
fi
