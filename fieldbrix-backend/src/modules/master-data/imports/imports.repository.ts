import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { rowToCamelCase } from '../support/case';

export type ImportJobRow = {
  id: string;
  entityType: string;
  status: string;
  previewRevision: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateMode: 'reject' | 'skip' | 'update';
  createdAt: string;
  updatedAt: string;
};

export type ImportRowOutcome = {
  rowNumber: number;
  status: 'VALID' | 'ERROR' | 'CREATED' | 'UPDATED' | 'SKIPPED';
  errorCode?: string;
  message?: string;
  rowData: Record<string, unknown>;
};

@Injectable()
export class ImportsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createJob(
    entityType: string,
    duplicateMode: string,
    uploadId: string | undefined,
    sourceChecksum: string | undefined,
    rows: ImportRowOutcome[],
  ): Promise<ImportJobRow> {
    return this.database.transaction(async (client) => {
      const tenant = await client.query<{ id: string }>(
        "SELECT current_setting('app.tenant_id', true)::uuid AS id",
      );
      const validCount = rows.filter((row) => row.status === 'VALID').length;
      const job = await client.query<Record<string, unknown>>(
        `INSERT INTO import_jobs (tenant_id, entity_type, source_file_id, source_checksum, status, preview_revision, total_rows, valid_rows, error_rows, duplicate_mode)
         VALUES ($1::uuid, $2, $3::uuid, $4, 'PREVIEWED', 1, $5, $6, $7, $8)
         RETURNING id::text AS id, entity_type, status, preview_revision, total_rows, valid_rows, error_rows, duplicate_mode, created_at, updated_at`,
        [
          tenant.rows[0].id,
          entityType,
          uploadId ?? null,
          sourceChecksum ?? null,
          rows.length,
          validCount,
          rows.length - validCount,
          duplicateMode,
        ],
      );
      for (const row of rows)
        await client.query(
          `INSERT INTO import_row_outcomes (tenant_id, import_id, row_number, status, error_code, message, row_data)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb)`,
          [
            tenant.rows[0].id,
            job.rows[0].id,
            row.rowNumber,
            row.status,
            row.errorCode ?? null,
            row.message ?? null,
            JSON.stringify(row.rowData),
          ],
        );
      return rowToCamelCase<ImportJobRow>(job.rows[0]);
    });
  }

  async findJob(id: string): Promise<ImportJobRow> {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT id::text AS id, entity_type, status, preview_revision, total_rows, valid_rows, error_rows, duplicate_mode, created_at, updated_at
       FROM import_jobs WHERE id = $1::uuid`,
      [id],
    );
    if (!result[0]) throw new NotFoundException('IMPORT_NOT_FOUND');
    return rowToCamelCase<ImportJobRow>(result[0]);
  }

  async findRows(
    id: string,
    statusFilter?: string,
  ): Promise<ImportRowOutcome[]> {
    const values: unknown[] = [id];
    let where = 'import_id = $1::uuid';
    if (statusFilter) {
      values.push(statusFilter);
      where += ` AND status = $${values.length}`;
    }
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT row_number, status, error_code, message, row_data FROM import_row_outcomes WHERE ${where} ORDER BY row_number`,
      values,
    );
    return result.map((row) => rowToCamelCase<ImportRowOutcome>(row));
  }

  async beginCommit(id: string, previewRevision: number): Promise<void> {
    const result = await this.database.tenantQuery<{ id: string }>(
      `UPDATE import_jobs SET status = 'PROCESSING', updated_at = clock_timestamp()
       WHERE id = $1::uuid AND status = 'PREVIEWED' AND preview_revision = $2 RETURNING id::text AS id`,
      [id, previewRevision],
    );
    if (!result[0])
      throw new NotFoundException('IMPORT_PREVIEW_REVISION_CONFLICT');
  }

  async recordRowResult(
    importId: string,
    rowNumber: number,
    status: 'CREATED' | 'UPDATED' | 'SKIPPED' | 'ERROR',
    entityId: string | undefined,
    errorCode: string | undefined,
    message: string | undefined,
  ): Promise<void> {
    await this.database.tenantQuery(
      `UPDATE import_row_outcomes SET status = $1, entity_id = $2::uuid, error_code = $3, message = $4
       WHERE import_id = $5::uuid AND row_number = $6`,
      [
        status,
        entityId ?? null,
        errorCode ?? null,
        message ?? null,
        importId,
        rowNumber,
      ],
    );
  }

  async completeJob(
    id: string,
    counts: { valid: number; errors: number },
  ): Promise<ImportJobRow> {
    const status =
      counts.errors === 0
        ? 'COMPLETED'
        : counts.valid === 0
          ? 'FAILED'
          : 'PARTIAL';
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `UPDATE import_jobs SET status = $1, valid_rows = $2, error_rows = $3, updated_at = clock_timestamp()
       WHERE id = $4::uuid
       RETURNING id::text AS id, entity_type, status, preview_revision, total_rows, valid_rows, error_rows, duplicate_mode, created_at, updated_at`,
      [status, counts.valid, counts.errors, id],
    );
    return rowToCamelCase<ImportJobRow>(result[0]);
  }

  async emitOutboxEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.database.emitOutboxEvent(eventType, payload);
  }
}
