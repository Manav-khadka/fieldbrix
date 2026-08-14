import * as Sentry from "@sentry/react";

const sensitiveKey =
  /authorization|cookie|password|secret|token|email|phone|presigned|s3key/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKey.test(key) ? "[redacted]" : redact(entry),
      ]),
    );
  }
  return value;
}

export function initializeSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT ??
      import.meta.env.VITE_APP_ENV ??
      "local",
    release:
      import.meta.env.VITE_SENTRY_RELEASE ??
      `fieldbrix-web@${import.meta.env.VITE_APP_VERSION ?? "0.0.0"}`,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend: (event) => redact(event) as typeof event,
  });
}
