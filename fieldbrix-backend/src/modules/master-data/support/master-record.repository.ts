import { ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { rowToCamelCase, toSnakeCase } from './case';

export type MasterRecord = Record<string, unknown> & {
  id: string;
  revision: number;
};

export type ListFilter = { column: string; value: unknown; uuid?: boolean };

export type ListQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

type Row = Record<string, unknown>;

/**
 * Shared tenant-scoped CRUD for the master-data entities (customers, sites,
 * service targets, parts) — they all share the same code/name/revision/
 * archived_at lifecycle. Entity-specific rules (parent existence, QR
 * identity, dependent-archive checks) live in the subclass, not here.
 *
 * Postgres returns snake_case column names; every row is mapped back to the
 * camelCase shape callers/DTOs use before it leaves this class.
 */
export abstract class MasterRecordRepository<T extends MasterRecord> {
  protected constructor(
    protected readonly database: DatabaseService,
    private readonly table: string,
    private readonly createColumns: string[],
    private readonly updateColumns: string[],
  ) {}

  async list(
    query: ListQuery,
    filters: ListFilter[] = [],
  ): Promise<{ items: T[]; total: number; page: number; limit: number }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const values: unknown[] = [];
    const where = ['archived_at IS NULL'];
    if (query.search) {
      values.push(`%${query.search.trim().toLowerCase()}%`);
      where.push(
        `(lower(name) LIKE $${values.length} OR lower(code) LIKE $${values.length})`,
      );
    }
    for (const filter of filters) {
      values.push(filter.value);
      where.push(
        `${filter.column} = $${values.length}${filter.uuid ? '::uuid' : ''}`,
      );
    }
    const whereClause = where.join(' AND ');
    const [items, count] = await Promise.all([
      this.database.tenantQuery<Row>(
        `SELECT t.*, t.id::text AS id FROM ${this.table} t WHERE ${whereClause} ORDER BY t.created_at DESC, t.id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, (page - 1) * limit],
      ),
      this.database.tenantQuery<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${this.table} WHERE ${whereClause}`,
        values,
      ),
    ]);
    return {
      items: items.map((row) => rowToCamelCase<T>(row)),
      total: Number(count[0]?.count ?? 0),
      page,
      limit,
    };
  }

  async findById(id: string): Promise<T | undefined> {
    const result = await this.database.tenantQuery<Row>(
      `SELECT *, id::text AS id FROM ${this.table} WHERE id = $1::uuid AND archived_at IS NULL`,
      [id],
    );
    return result[0] ? rowToCamelCase<T>(result[0]) : undefined;
  }

  async findByCode(code: string): Promise<T | undefined> {
    const result = await this.database.tenantQuery<Row>(
      `SELECT *, id::text AS id FROM ${this.table} WHERE lower(code) = lower($1) AND archived_at IS NULL`,
      [code],
    );
    return result[0] ? rowToCamelCase<T>(result[0]) : undefined;
  }

  async findOrFail(id: string): Promise<T> {
    const record = await this.findById(id);
    if (!record) throw new NotFoundException('RECORD_NOT_FOUND');
    return record;
  }

  async create(payloadValue: object): Promise<T> {
    const payload = payloadValue as Row;
    const columns = this.createColumns.filter(
      (key) => payload[key] !== undefined,
    );
    const dbColumns = columns.map(toSnakeCase);
    const values = columns.map((key) => payload[key]);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    try {
      const result = await this.database.tenantQuery<Row>(
        `INSERT INTO ${this.table} (tenant_id, ${dbColumns.join(', ')}) VALUES (current_setting('app.tenant_id', true)::uuid, ${placeholders.join(', ')}) RETURNING *, id::text AS id`,
        values,
      );
      return rowToCamelCase<T>(result[0]);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async update(
    id: string,
    payloadValue: object,
    expectedRevision?: number,
  ): Promise<T> {
    const payload = payloadValue as Row;
    const columns = this.updateColumns.filter(
      (key) => payload[key] !== undefined,
    );
    const values = columns.map((key) => payload[key]);
    const set = columns.map(
      (key, index) => `${toSnakeCase(key)} = $${index + 1}`,
    );
    set.push('revision = revision + 1', 'updated_at = clock_timestamp()');
    values.push(id);
    let where = `id = $${values.length}::uuid AND archived_at IS NULL`;
    if (expectedRevision !== undefined) {
      values.push(expectedRevision);
      where += ` AND revision = $${values.length}`;
    }
    try {
      const result = await this.database.tenantQuery<Row>(
        `UPDATE ${this.table} SET ${set.join(', ')} WHERE ${where} RETURNING *, id::text AS id`,
        values,
      );
      if (!result[0]) {
        const existing = await this.findById(id);
        if (!existing) throw new NotFoundException('RECORD_NOT_FOUND');
        throw new ConflictException('STALE_REVISION');
      }
      return rowToCamelCase<T>(result[0]);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      throw this.mapWriteError(error);
    }
  }

  async archive(id: string, expectedRevision: number): Promise<T> {
    const result = await this.database.tenantQuery<Row>(
      `UPDATE ${this.table} SET archived_at = clock_timestamp(), revision = revision + 1, updated_at = clock_timestamp() WHERE id = $1::uuid AND revision = $2 AND archived_at IS NULL RETURNING *, id::text AS id`,
      [id, expectedRevision],
    );
    if (!result[0]) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundException('RECORD_NOT_FOUND');
      throw new ConflictException('STALE_REVISION');
    }
    return rowToCamelCase<T>(result[0]);
  }

  async hasActiveDependents(
    table: string,
    column: string,
    id: string,
  ): Promise<boolean> {
    const result = await this.database.tenantQuery<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM ${table} WHERE ${column} = $1::uuid AND archived_at IS NULL) AS exists`,
      [id],
    );
    return Boolean(result[0]?.exists);
  }

  private mapWriteError(error: unknown): Error {
    const code = (error as { code?: string } | undefined)?.code;
    if (code === '23505') return new ConflictException('DUPLICATE_CODE');
    if (code === '23503') return new ConflictException('INVALID_REFERENCE');
    return error as Error;
  }
}
