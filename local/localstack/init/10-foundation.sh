#!/bin/sh
set -eu

awslocal s3api create-bucket --bucket fieldbrix-local-uploads \
  --create-bucket-configuration LocationConstraint=ap-south-1 2>/dev/null || true
awslocal s3api put-bucket-versioning --bucket fieldbrix-local-uploads \
  --versioning-configuration Status=Enabled

awslocal sqs create-queue --queue-name fieldbrix-local-dlq >/dev/null
awslocal sqs create-queue --queue-name fieldbrix-local-jobs >/dev/null
