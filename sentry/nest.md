# Sentry for NestJS

Hosted project: `fieldbrixxx/nest`. Follow the current official Sentry NestJS documentation when implementing; use the same latest-compatible-stable Sentry JavaScript release family as the React app.

## Runtime contract

```bash
SENTRY_DSN=
SENTRY_ENVIRONMENT=local
SENTRY_RELEASE=fieldbrix-backend@0.0.0-dev
```

An empty DSN disables local reporting. Never hard-code a DSN. `SENTRY_AUTH_TOKEN` is CI-only and must not exist in the API runtime environment.

Initialize Sentry in `src/instrument.ts` before other application imports:

```ts
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Implement and test the shared redaction policy before production use.
      return event;
    },
  });
}
```

Import `./instrument` first in `main.ts`, then register `SentryModule.forRoot()` in the root module. Integrate a global catch-all filter through `SentryGlobalFilter` before application filters, or decorate the existing catch-all filter with `@SentryExceptionCaptured()`—never do both in a way that duplicates events.

In CI, inject and upload the compiled server source maps to `fieldbrixxx/nest` with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=fieldbrixxx` and `SENTRY_BACKEND_PROJECT=nest`; do not publish the maps with the runtime artifact. The upload release must equal `SENTRY_RELEASE`. Use a Sentry `dist` only when the same release has multiple independently deployed server artifacts, and match that immutable build identifier during upload and initialization.

## Telemetry and privacy

- Instrument normalized HTTP routes plus Prisma, SQS and S3 spans; propagate the existing correlation ID across jobs.
- Tag stable low-cardinality fields only. Raw tenant/user/entity IDs may appear only in explicitly scrubbed context when policy permits.
- Treat validation, expected domain errors, invalid credentials and forbidden requests as structured logs/metrics or breadcrumbs, not exception issues.
- Request/response bodies, authorization headers, cookies, passwords, reset tokens, uploaded content, object keys and presigned URLs must never be sent.
- Alerts cover new unhandled errors and sustained unexpected-error rate, each with owner and runbook.

## Safe verification

Use a test-only route or direct `captureException` in a disposable environment. Verify `fieldbrixxx/nest`, release/environment, correlation, stack trace and scrubbed payload, then remove or disable the trigger. Production must not expose a public `/debug-sentry` endpoint.
