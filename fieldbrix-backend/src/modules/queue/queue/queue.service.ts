import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';
import { TenantContextService } from '../../tenant-context/tenant-context/tenant-context.service';

export type QueueEnvelope<T> = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  tenantId: string;
  actorId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  payload: T;
};
export type QueueConsumeResult = {
  status: 'processed' | 'retry' | 'dead_lettered';
  eventId: string;
  attempt: number;
  retryAfterMs?: number;
  deadLetter?: Record<string, unknown>;
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenantContext: TenantContextService,
  ) {}
  private readonly client = new SQSClient({
    region: process.env.AWS_REGION ?? 'ap-south-1',
    endpoint: process.env.SQS_ENDPOINT || undefined,
  });
  private readonly queueUrl = process.env.SQS_QUEUE_URL;
  private readonly attempts = new Map<string, number>();
  private readonly processed = new Set<string>();
  async publish<T>(
    eventType: string,
    payload: T,
    context: Omit<
      QueueEnvelope<T>,
      'eventId' | 'eventType' | 'eventVersion' | 'occurredAt' | 'payload'
    >,
  ) {
    const envelope: QueueEnvelope<T> = {
      ...context,
      eventId: randomUUID(),
      eventType,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      payload,
    };
    const durable =
      this.database.isConfigured() &&
      this.isUuid(envelope.eventId) &&
      this.isUuid(envelope.tenantId) &&
      (!envelope.actorId || this.isUuid(envelope.actorId));
    if (durable)
      await this.tenantContext.run(envelope.tenantId, envelope.actorId, () =>
        this.database.tenantQuery(
          'INSERT INTO outbox_events (id, event_id, event_type, event_version, tenant_id, actor_id, correlation_id, idempotency_key, payload, status) VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::uuid, $7, $8, $9::jsonb, $10) ON CONFLICT (event_id) DO NOTHING',
          [
            randomUUID(),
            envelope.eventId,
            envelope.eventType,
            envelope.eventVersion,
            envelope.tenantId,
            envelope.actorId ?? null,
            envelope.correlationId ?? null,
            envelope.idempotencyKey ?? null,
            JSON.stringify(envelope.payload),
            this.queueUrl ? 'PENDING' : 'PUBLISHED',
          ],
        ),
      );
    if (this.queueUrl) {
      const queueUrl = this.queueUrl;
      try {
        const message = {
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(envelope),
          ...(queueUrl.endsWith('.fifo')
            ? { MessageGroupId: context.tenantId }
            : {}),
        };
        await this.client.send(new SendMessageCommand(message));
        if (durable)
          await this.tenantContext.run(
            envelope.tenantId,
            envelope.actorId,
            () =>
              this.database.tenantQuery(
                'UPDATE outbox_events SET status = $2, published_at = clock_timestamp(), attempt_count = attempt_count + 1 WHERE event_id = $1::uuid',
                [envelope.eventId, 'PUBLISHED'],
              ),
          );
      } catch (error) {
        if (durable)
          await this.tenantContext.run(
            envelope.tenantId,
            envelope.actorId,
            () =>
              this.database.tenantQuery(
                'UPDATE outbox_events SET status = $2, attempt_count = attempt_count + 1, last_error = $3 WHERE event_id = $1::uuid',
                [
                  envelope.eventId,
                  'RETRY',
                  error instanceof Error ? error.message : 'publish_failed',
                ],
              ),
          );
        throw error;
      }
    }
    return envelope;
  }
  validateEnvelope<T>(candidate: unknown): QueueEnvelope<T> {
    if (!candidate || typeof candidate !== 'object')
      throw new Error('INVALID_QUEUE_ENVELOPE');
    const envelope = candidate as Partial<QueueEnvelope<T>>;
    if (
      typeof envelope.eventId !== 'string' ||
      !this.isUuid(envelope.eventId) ||
      !envelope.eventType ||
      !Number.isInteger(envelope.eventVersion) ||
      envelope.eventVersion !== 1 ||
      typeof envelope.occurredAt !== 'string' ||
      Number.isNaN(Date.parse(envelope.occurredAt)) ||
      typeof envelope.tenantId !== 'string' ||
      !this.isUuid(envelope.tenantId) ||
      (envelope.actorId !== undefined &&
        (typeof envelope.actorId !== 'string' ||
          !this.isUuid(envelope.actorId))) ||
      (envelope.correlationId !== undefined &&
        typeof envelope.correlationId !== 'string') ||
      envelope.payload === undefined
    )
      throw new Error('INVALID_QUEUE_ENVELOPE');
    return envelope as QueueEnvelope<T>;
  }
  retryDelayMs(attempt: number) {
    const boundedAttempt = Math.min(Math.max(attempt, 0), 8);
    return Math.min(15 * 60_000, 1_000 * 2 ** boundedAttempt);
  }
  deadLetterMetadata<T>(
    envelope: QueueEnvelope<T>,
    attempt: number,
    error: unknown,
  ) {
    return {
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      tenantId: envelope.tenantId,
      attempt,
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'unknown_error',
      sourceQueue: this.queueUrl ?? 'unconfigured',
    };
  }
  async consume<T>(
    candidate: unknown,
    handler: (envelope: QueueEnvelope<T>) => Promise<void> | void,
    maxAttempts = 5,
  ): Promise<QueueConsumeResult> {
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20)
      throw new Error('INVALID_MAX_ATTEMPTS');
    const envelope = this.validateEnvelope<T>(candidate);
    if (this.processed.has(envelope.eventId))
      return {
        status: 'processed',
        eventId: envelope.eventId,
        attempt: this.attempts.get(envelope.eventId) ?? 1,
      };
    if (
      !this.attempts.has(envelope.eventId) &&
      this.database.isConfigured() &&
      this.isUuid(envelope.eventId) &&
      this.isUuid(envelope.tenantId)
    ) {
      const state = await this.tenantContext.run(
        envelope.tenantId,
        envelope.actorId,
        () =>
          this.database.tenantQuery<{ attempt: number; succeeded: boolean }>(
            "SELECT COALESCE(MAX(attempt_number), 0)::int AS attempt, COALESCE(bool_or(status = 'SUCCEEDED'), false) AS succeeded FROM worker_job_attempts WHERE event_id = $1::uuid",
            [envelope.eventId],
          ),
      );
      if (state[0]?.succeeded) {
        this.processed.add(envelope.eventId);
        return {
          status: 'processed',
          eventId: envelope.eventId,
          attempt: state[0].attempt,
        };
      }
      if (state[0]?.attempt)
        this.attempts.set(envelope.eventId, state[0].attempt);
    }
    const attempt = (this.attempts.get(envelope.eventId) ?? 0) + 1;
    this.attempts.set(envelope.eventId, attempt);
    await this.recordAttempt(envelope, attempt, 'STARTED');
    try {
      await handler(envelope);
      this.processed.add(envelope.eventId);
      this.attempts.delete(envelope.eventId);
      await this.recordAttempt(envelope, attempt, 'SUCCEEDED');
      return { status: 'processed', eventId: envelope.eventId, attempt };
    } catch (error) {
      const deadLettered = attempt >= maxAttempts;
      await this.recordAttempt(
        envelope,
        attempt,
        deadLettered ? 'DEAD_LETTERED' : 'FAILED',
        error,
      );
      if (deadLettered) {
        if (this.isUuid(envelope.eventId) && this.isUuid(envelope.tenantId))
          await this.tenantContext.run(
            envelope.tenantId,
            envelope.actorId,
            () =>
              this.database.tenantQuery(
                'UPDATE outbox_events SET status = $2, dead_lettered_at = clock_timestamp(), last_error = $3 WHERE event_id = $1::uuid',
                [
                  envelope.eventId,
                  'DEAD_LETTERED',
                  error instanceof Error ? error.message : 'unknown_error',
                ],
              ),
          );
        return {
          status: 'dead_lettered',
          eventId: envelope.eventId,
          attempt,
          deadLetter: this.deadLetterMetadata(envelope, attempt, error),
        };
      }
      return {
        status: 'retry',
        eventId: envelope.eventId,
        attempt,
        retryAfterMs: this.retryDelayMs(attempt),
      };
    }
  }
  readiness() {
    return {
      configured: Boolean(this.queueUrl),
      queueUrl: this.queueUrl ?? null,
    };
  }
  onModuleDestroy() {
    this.client.destroy();
  }
  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
  private async recordAttempt<T>(
    envelope: QueueEnvelope<T>,
    attempt: number,
    status: 'STARTED' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTERED',
    error?: unknown,
  ) {
    if (
      !this.database.isConfigured() ||
      !this.isUuid(envelope.eventId) ||
      !this.isUuid(envelope.tenantId)
    )
      return;
    await this.tenantContext.run(envelope.tenantId, envelope.actorId, () =>
      this.database.tenantQuery(
        "INSERT INTO worker_job_attempts (id, event_id, attempt_number, status, error_message, finished_at) SELECT $1::uuid, $2::uuid, $3, $4, $5, CASE WHEN $4 = 'STARTED' THEN NULL ELSE clock_timestamp() END ON CONFLICT (event_id, attempt_number) DO UPDATE SET status = EXCLUDED.status, error_message = EXCLUDED.error_message, finished_at = EXCLUDED.finished_at",
        [
          randomUUID(),
          envelope.eventId,
          attempt,
          status,
          error instanceof Error
            ? error.message
            : error
              ? 'unknown_error'
              : null,
        ],
      ),
    );
  }
}
