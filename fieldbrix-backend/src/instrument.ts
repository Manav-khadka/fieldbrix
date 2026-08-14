import * as Sentry from '@sentry/nestjs';
import { scrubSentryEvent } from './observability/sentry';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.APP_ENV ?? 'local',
    release:
      process.env.SENTRY_RELEASE ??
      `fieldbrix-backend@${process.env.APP_VERSION ?? '0.0.1'}`,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    beforeSend: scrubSentryEvent,
  });
}
