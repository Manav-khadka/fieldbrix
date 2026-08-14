# Sentry for Vite + React

Hosted project: `fieldbrixxx/vite-react`. Follow the current official Sentry React/Vite documentation when implementing; use the latest compatible stable `@sentry/react` release and commit the resolved lockfile.

## Runtime contract

```bash
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=local
VITE_SENTRY_RELEASE=fieldbrix-web@0.0.0-dev
```

An empty DSN disables local reporting. Never hard-code a DSN in source. A DSN is not an administrative secret, but keeping it in environment configuration prevents event-injection and environment mix-ups. `SENTRY_AUTH_TOKEN` is CI-only and must never be exposed as a `VITE_*` variable.

Initialize Sentry before rendering React and only when a DSN exists:

```ts
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Implement and test the shared redaction policy before production use.
      return event;
    },
  });
}
```

The placeholder `beforeSend` is not a finished scrubber. Sprint 01 must remove authorization/cookie values, form bodies, emails, phone numbers, presigned URLs and tenant/user IDs before production reporting is enabled. Browser replay remains disabled until Security approves masking tests.

## Integration and releases

- Put an error boundary around the route shell and feature-level recovery boundaries around high-risk editors and reports.
- Use normalized route names and low-cardinality tags such as `module`, `operation`, `tenantPlan` and `appVersion`; never tag raw tenant, user or entity IDs.
- Expected validation, authorization and domain outcomes are UI state/metrics, not noisy exception issues.
- Upload source maps in CI with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=fieldbrixxx` and `SENTRY_WEB_PROJECT=vite-react`; delete or hide public source maps after upload.
- The CI release identifier must exactly match `VITE_SENTRY_RELEASE` in the built artifact.
- When one release has multiple independently deployed asset bundles, set Sentry `dist` to the immutable CI build/artifact identifier and use the same value for source-map upload. Omit `dist` when there is only one web artifact; never substitute an environment name for it.

## Safe verification

Expose an intentional error only in a development/test-only component or route. Verify the event reaches `fieldbrixxx/vite-react`, has the expected release/environment, has usable source maps and contains no secrets, PII, request bodies or presigned URLs. Remove or compile out the verification trigger before release.
