# Sentry for Python Lambdas

Hosted project: `fieldbrixxx/lambdas`. Create it during Sprint 01 and instrument each Python Lambda only when that function enters scope.

## Configuration contract

- Runtime: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` through encrypted deployment configuration/SSM as appropriate.
- CI only: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=fieldbrixxx`, `SENTRY_LAMBDAS_PROJECT=lambdas`.
- Use the latest compatible stable Sentry Python AWS Lambda integration, pinned in the function dependency lock/artifact.

Initialize outside the handler so warm invocations reuse the client. Use bounded trace sampling, normalized function/job names, release/environment identifiers and a tested event processor that removes queue payloads, S3 keys/presigned URLs, email content, credentials, PII and raw tenant/user/entity identifiers.

Expected invalid jobs belong in metrics and structured job results. Capture unexpected handler crashes, dependency failures and invariant violations with the existing correlation/event ID. Flush within the Lambda integration's supported lifecycle without extending timeouts materially.

Verify with a disposable test invocation and confirm project, release, environment, trace linkage and scrubbing. Never leave a production payload that deliberately throws.
