import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { TenantContextService } from '../../tenant-context/tenant-context/tenant-context.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool | null;
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly config: ConfigService,
  ) {
    const connectionString = this.config.get<string>('DATABASE_URL');
    const passwordB64 = this.config.get<string>('DB_PASSWORD_B64');
    const password = passwordB64
      ? Buffer.from(passwordB64, 'base64').toString('utf8')
      : this.config.get<string>('DB_PASSWORD');
    this.pool = connectionString
      ? new Pool({
          connectionString,
          max: Number(this.config.get<string>('DB_POOL_MAX', '10')),
          statement_timeout: 10_000,
        })
      : this.config.get<string>('DB_HOST') && password
        ? new Pool({
            host: this.config.get<string>('DB_HOST'),
            port: this.config.get<number>('DB_PORT', 5432),
            database: this.config.get<string>('DB_NAME', 'fieldbrix'),
            user: this.config.get<string>('DB_USER', 'fieldbrix_admin'),
            password,
            max: Number(this.config.get<string>('DB_POOL_MAX', '10')),
            statement_timeout: 10_000,
            ssl:
              this.config.get<string>('NODE_ENV') === 'production'
                ? { rejectUnauthorized: true }
                : false,
          })
        : null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    if (!this.pool) return [];
    const tenantId = this.tenantContext.currentTenantId;
    if (tenantId) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', [
          'app.tenant_id',
          tenantId,
        ]);
        const result = await client.query<T>(text, values);
        await client.query('COMMIT');
        return result.rows;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    const result = await this.pool.query<T>(text, values);
    return result.rows;
  }
  isConfigured(): boolean {
    return this.pool !== null;
  }

  async tenantQuery<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    if (!this.pool) return [];
    const tenantId = this.tenantContext.currentTenantId;
    if (!tenantId) throw new Error('TENANT_CONTEXT_REQUIRED');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      const result = await client.query<T>(text, values);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('DATABASE_NOT_CONFIGURED');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tenantId = this.tenantContext.currentTenantId;
      if (tenantId)
        await client.query('SELECT set_config($1, $2, true)', [
          'app.tenant_id',
          tenantId,
        ]);
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async readiness(): Promise<{ configured: boolean; reachable: boolean }> {
    if (!this.pool) return { configured: false, reachable: false };
    try {
      await this.pool.query('SELECT 1');
      return { configured: true, reachable: true };
    } catch (error) {
      this.logger.warn(
        `Database readiness failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { configured: true, reachable: false };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
