const sensitiveKey =
  /authorization|cookie|password|secret|token|email|phone|presigned|s3key/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKey.test(key) ? '[redacted]' : redact(entry),
      ]),
    );
  }
  return value;
}

export function scrubSentryEvent<T>(event: T): T {
  return redact(event) as T;
}
