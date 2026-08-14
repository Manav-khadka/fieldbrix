import { scrubSentryEvent } from './sentry';

describe('scrubSentryEvent', () => {
  it('redacts nested credentials and direct identifiers', () => {
    const event = scrubSentryEvent({
      request: {
        headers: { authorization: 'Bearer secret', cookie: 'session=value' },
        body: { email: 'user@example.com', safe: 'kept' },
      },
    });

    expect(event).toEqual({
      request: {
        headers: { authorization: '[redacted]', cookie: '[redacted]' },
        body: { email: '[redacted]', safe: 'kept' },
      },
    });
  });
});
