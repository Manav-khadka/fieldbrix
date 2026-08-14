import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';
import { TenantContextService } from '../../tenant-context/tenant-context/tenant-context.service';

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenantContext: TenantContextService,
  ) {}
  private readonly records = new Map<
    string,
    { fingerprint: string; response: unknown; expiresAt: number }
  >();
  private readonly inFlight = new Map<
    string,
    { fingerprint: string; promise: Promise<unknown> }
  >();
  private readonly uuidV4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  fingerprint(method: string, path: string, body: unknown) {
    return createHash('sha256')
      .update(JSON.stringify({ method, path, body }))
      .digest('hex');
  }
  validate(key: string | undefined) {
    if (!key || !this.uuidV4.test(key))
      throw new ConflictException('INVALID_IDEMPOTENCY_KEY');
    return key;
  }
  getOrCreate<T>(
    key: string,
    fingerprint: string,
    factory: () => T,
  ): { replayed: boolean; response: T } {
    this.validate(key);
    const existing = this.records.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      if (existing.fingerprint !== fingerprint)
        throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
      return { replayed: true, response: existing.response as T };
    }
    const response = factory();
    this.records.set(key, {
      fingerprint,
      response,
      expiresAt: Date.now() + 24 * 60 * 60_000,
    });
    return { replayed: false, response };
  }
  async getOrCreateAsync<T>(
    key: string,
    fingerprint: string,
    factory: () => Promise<T> | T,
  ): Promise<{ replayed: boolean; response: T }> {
    this.validate(key);
    const tenantId = this.tenantContext.currentTenantId;
    if (!this.database.isConfigured() || !tenantId) {
      const local = this.records.get(key);
      if (local && local.expiresAt > Date.now()) {
        if (local.fingerprint !== fingerprint)
          throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
        return { replayed: true, response: local.response as T };
      }
      const running = this.inFlight.get(key);
      if (running) {
        if (running.fingerprint !== fingerprint)
          throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
        return { replayed: true, response: (await running.promise) as T };
      }
      const execution = Promise.resolve().then(factory);
      this.inFlight.set(key, { fingerprint, promise: execution });
      try {
        const response = await execution;
        this.records.set(key, {
          fingerprint,
          response,
          expiresAt: Date.now() + 24 * 60 * 60_000,
        });
        return { replayed: false, response };
      } finally {
        this.inFlight.delete(key);
      }
    }
    const existing = await this.database.query<{
      requestHash: string;
      response: T;
      statusCode: number;
      expiresAt: string;
    }>(
      'SELECT request_hash AS "requestHash", response, status_code AS "statusCode", expires_at AS "expiresAt" FROM idempotency_records WHERE tenant_id = $1::uuid AND key = $2::uuid AND expires_at > clock_timestamp()',
      [tenantId, key],
    );
    if (existing[0]) {
      if (existing[0].requestHash !== fingerprint)
        throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
      if (existing[0].statusCode === 102)
        throw new ConflictException('IDEMPOTENCY_IN_PROGRESS');
      return { replayed: true, response: existing[0].response };
    }
    const inserted = await this.database.query<{ key: string }>(
      "INSERT INTO idempotency_records (tenant_id, key, request_hash, status_code, response, expires_at) VALUES ($1::uuid, $2::uuid, $3, 102, '{}'::jsonb, clock_timestamp() + interval '24 hours') ON CONFLICT (tenant_id, key) DO NOTHING RETURNING key::text",
      [tenantId, key, fingerprint],
    );
    if (!inserted[0]) {
      const winner = await this.database.query<{
        requestHash: string;
        response: T;
        statusCode: number;
      }>(
        'SELECT request_hash AS "requestHash", response, status_code AS "statusCode" FROM idempotency_records WHERE tenant_id = $1::uuid AND key = $2::uuid',
        [tenantId, key],
      );
      if (!winner[0] || winner[0].requestHash !== fingerprint)
        throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
      if (winner[0].statusCode === 102)
        throw new ConflictException('IDEMPOTENCY_IN_PROGRESS');
      return { replayed: true, response: winner[0].response };
    }
    try {
      const response = await factory();
      await this.database.query(
        'UPDATE idempotency_records SET status_code = 200, response = $3::jsonb WHERE tenant_id = $1::uuid AND key = $2::uuid',
        [tenantId, key, JSON.stringify(response)],
      );
      return { replayed: false, response };
    } catch (error) {
      await this.database
        .query(
          'DELETE FROM idempotency_records WHERE tenant_id = $1::uuid AND key = $2::uuid AND status_code = 102',
          [tenantId, key],
        )
        .catch(() => undefined);
      throw error;
    }
  }
}
