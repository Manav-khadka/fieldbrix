import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ImportsRepository, type ImportRowOutcome } from './imports.repository';
import { ImportProcessorService } from './import-processor.service';
import { SpreadsheetParserService } from './spreadsheet-parser.service';
import type { ImportPreviewDto } from '../dto/import.dto';
import { omit } from '../support/case';
import { TenantContextService } from '../../tenant-context/tenant-context/tenant-context.service';

const MAX_ROWS = 5000;

@Injectable()
export class ImportsService {
  constructor(
    private readonly repository: ImportsRepository,
    private readonly processor: ImportProcessorService,
    private readonly spreadsheetParser: SpreadsheetParserService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async preview(dto: ImportPreviewDto) {
    const rowsInput = Array.isArray(dto.rows)
      ? dto.rows
      : dto.uploadId
        ? await this.spreadsheetParser.parseUpload(
            dto.uploadId,
            this.tenantContext.tenantId,
          )
        : undefined;
    if (!rowsInput || rowsInput.length === 0)
      throw new BadRequestException('ROWS_OR_UPLOAD_ID_REQUIRED');
    if (rowsInput.length > MAX_ROWS)
      throw new PayloadTooLargeException('IMPORT_ROW_LIMIT_EXCEEDED');
    const rows: ImportRowOutcome[] = rowsInput.map((row, index) => {
      const validation = this.processor.validateRow(dto.entityType, row);
      return {
        rowNumber: index + 1,
        status: validation.valid ? 'VALID' : 'ERROR',
        errorCode: validation.errorCode,
        message: validation.message,
        rowData: row,
      };
    });
    return this.repository.createJob(
      dto.entityType,
      dto.duplicateMode ?? 'reject',
      dto.uploadId,
      dto.sourceChecksum,
      rows,
    );
  }

  async commit(importId: string, previewRevision: number) {
    await this.repository.beginCommit(importId, previewRevision);
    const job = await this.repository.findJob(importId);
    const validRows = await this.repository.findRows(importId, 'VALID');
    let valid = 0;
    let errors = 0;
    for (const row of validRows) {
      const result = await this.processor.commitRow(
        job.entityType as 'customers' | 'sites' | 'service_targets' | 'parts',
        row.rowData,
        job.duplicateMode,
      );
      if (result.outcome === 'ERROR') {
        errors += 1;
        await this.repository.recordRowResult(
          importId,
          row.rowNumber,
          'ERROR',
          undefined,
          result.errorCode,
          result.message,
        );
      } else if (result.outcome === 'SKIPPED') {
        valid += 1;
        await this.repository.recordRowResult(
          importId,
          row.rowNumber,
          'SKIPPED',
          undefined,
          undefined,
          undefined,
        );
      } else {
        valid += 1;
        await this.repository.recordRowResult(
          importId,
          row.rowNumber,
          result.outcome,
          result.entityId,
          undefined,
          undefined,
        );
      }
    }
    const errorRowsFromPreview = job.totalRows - job.validRows;
    const completed = await this.repository.completeJob(importId, {
      valid,
      errors: errors + errorRowsFromPreview,
    });
    await this.repository.emitOutboxEvent('master.import.commit.v1', {
      importId,
      entityType: job.entityType,
      valid,
      errors: errors + errorRowsFromPreview,
    });
    return completed;
  }

  async status(importId: string) {
    const job = await this.repository.findJob(importId);
    const errorRows = await this.repository.findRows(importId, 'ERROR');
    return { ...job, errors: errorRows.map((row) => omit(row, ['rowData'])) };
  }
}
