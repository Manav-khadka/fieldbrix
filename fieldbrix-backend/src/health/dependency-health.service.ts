import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Pool } from 'pg';

type DependencyStatus = 'ok' | 'not_configured' | 'unavailable';

export interface ReadinessResult {
  database: DependencyStatus;
  objectStorage: DependencyStatus;
  queue: DependencyStatus;
}

@Injectable()
export class DependencyHealthService implements OnModuleDestroy {
  private readonly database: Pool | null;
  private readonly objectStorage: S3Client | null;
  private readonly queue: SQSClient | null;
  private readonly bucket: string | undefined;
  private readonly queueUrl: string | undefined;

  constructor(private readonly config: ConfigService) {
    const databaseHost = this.config.get<string>('DB_HOST');
    const password = this.getDatabasePassword();
    this.database =
      databaseHost && password
        ? new Pool({
            host: databaseHost,
            port: this.config.get<number>('DB_PORT', 5432),
            database: this.config.get<string>('DB_NAME', 'fieldbrix'),
            user: this.config.get<string>('DB_USER', 'fieldbrix_admin'),
            password,
            ssl:
              this.config.get<string>('NODE_ENV') === 'production'
                ? { rejectUnauthorized: true }
                : false,
            max: 4,
            connectionTimeoutMillis: 5_000,
            idleTimeoutMillis: 30_000,
          })
        : null;
    // PostgreSQL emits idle-client failures on the pool. Handling the event
    // keeps the process alive so readiness, rather than liveness, reports an
    // unavailable database.
    this.database?.on('error', () => undefined);

    this.bucket = this.config.get<string>('S3_BUCKET');
    this.queueUrl = this.config.get<string>('SQS_QUEUE_URL');
    const clientConfiguration = {
      region: this.config.get<string>('AWS_REGION', 'ap-south-1'),
      endpoint: this.config.get<string>('AWS_ENDPOINT_URL'),
      forcePathStyle: Boolean(this.config.get<string>('AWS_ENDPOINT_URL')),
    };
    this.objectStorage = this.bucket ? new S3Client(clientConfiguration) : null;
    this.queue = this.queueUrl ? new SQSClient(clientConfiguration) : null;
  }

  async check(): Promise<ReadinessResult> {
    const [database, objectStorage, queue] = await Promise.all([
      this.checkDatabase(),
      this.checkObjectStorage(),
      this.checkQueue(),
    ]);
    return { database, objectStorage, queue };
  }

  async onModuleDestroy(): Promise<void> {
    await this.database?.end();
    this.objectStorage?.destroy();
    this.queue?.destroy();
  }

  private getDatabasePassword(): string | undefined {
    const encoded = this.config.get<string>('DB_PASSWORD_B64');
    if (encoded) {
      return Buffer.from(encoded, 'base64').toString('utf8');
    }
    return this.config.get<string>('DB_PASSWORD');
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    if (!this.database) return 'not_configured';
    try {
      await this.database.query('SELECT 1');
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }

  private async checkObjectStorage(): Promise<DependencyStatus> {
    if (!this.objectStorage || !this.bucket) return 'not_configured';
    try {
      await this.objectStorage.send(
        new HeadBucketCommand({ Bucket: this.bucket }),
      );
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }

  private async checkQueue(): Promise<DependencyStatus> {
    if (!this.queue || !this.queueUrl) return 'not_configured';
    try {
      await this.queue.send(
        new GetQueueAttributesCommand({
          QueueUrl: this.queueUrl,
          AttributeNames: ['QueueArn'],
        }),
      );
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }
}
