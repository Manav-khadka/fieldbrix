const validNodeEnvironments = new Set(['development', 'test', 'production']);

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function requiredInProduction(name: string, value: string | undefined): void {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} is required when NODE_ENV=production`);
  }
}

export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv = stringValue(config.NODE_ENV, 'development');
  if (!validNodeEnvironments.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 through 65535');
  }

  const normalized = {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    APP_ENV: stringValue(config.APP_ENV, 'local'),
    APP_VERSION: stringValue(config.APP_VERSION, '0.0.1'),
    APP_COMMIT_SHA: stringValue(config.APP_COMMIT_SHA, 'development'),
    AWS_REGION: stringValue(config.AWS_REGION, 'ap-south-1'),
    PLATFORM_ADMIN_TOKEN: stringValue(
      config.PLATFORM_ADMIN_TOKEN,
      nodeEnv === 'production'
        ? 'platform-admin-prod-token'
        : 'local-platform-admin',
    ),
    PLATFORM_ADMIN_REAUTH: stringValue(
      config.PLATFORM_ADMIN_REAUTH,
      nodeEnv === 'production'
        ? 'platform-admin-prod-reauth'
        : 'local-platform-reauth',
    ),
  };

  requiredInProduction('DB_HOST', stringValue(config.DB_HOST, ''));
  requiredInProduction(
    'DB_PASSWORD_B64',
    stringValue(config.DB_PASSWORD_B64, ''),
  );
  requiredInProduction('S3_BUCKET', stringValue(config.S3_BUCKET, ''));
  requiredInProduction('SQS_QUEUE_URL', stringValue(config.SQS_QUEUE_URL, ''));

  return normalized;
}
