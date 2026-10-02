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
import { TaskFieldProfileService } from '../../tasks/task-field-profile/task-field-profile.service';
import type {
  TaskFieldDataType,
  TaskFieldDefinitionDto,
} from '../../tasks/task-field-profile/task-field-profile.dto';

const MAX_ROWS = 5000;

const normalizeHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const TASK_ALIASES: Record<string, string[]> = {
  externalReferenceId: [
    'externalReferenceId',
    'referenceId',
    'reference',
    'taskId',
    'jobId',
  ],
  contactPhone: ['contactPhone', 'phone', 'phoneNumber', 'mobile'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon', 'long'],
  description: ['description', 'task', 'job', 'summary', 'title'],
  instructions: ['instructions', 'notes', 'jobNotes'],
  scheduledAt: ['scheduledAt', 'scheduled', 'appointmentAt'],
  dueAt: ['dueAt', 'due', 'deadline'],
  estimatedMinutes: ['estimatedMinutes', 'durationMinutes', 'duration'],
  priority: ['priority'],
  customerId: ['customerId'],
  siteId: ['siteId'],
  targetId: ['targetId', 'serviceTargetId'],
  workflowVersionId: ['workflowVersionId'],
};

const REQUIRED_TASK_COLUMN_TARGETS = [
  'externalReferenceId',
  'contactPhone',
  'latitude',
  'longitude',
] as const;
const TASK_CONTEXT_FIELDS = [
  'customerId',
  'siteId',
  'targetId',
  'workflowVersionId',
  'assignmentWorkerId',
  'assignmentTeamId',
  'supervisorIds',
  'verificationMode',
  'requiredApprovals',
  'qualityTeamId',
] as const;

function convertCustomValue(
  value: unknown,
  dataType: TaskFieldDataType,
): unknown {
  if (value === null || value === undefined || value === '') return value;
  if (dataType === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (dataType === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string' && typeof value !== 'number') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  }
  if (dataType === 'date' && value instanceof Date) return value.toISOString();
  return value;
}

export function normalizeTaskRow(
  row: Record<string, unknown>,
  columnMapping?: Record<string, string>,
  fieldDefinitions: TaskFieldDefinitionDto[] = [],
): Record<string, unknown> {
  const entries = Object.entries(row);
  const byHeader = new Map(
    entries.map(([key, value]) => [normalizeHeader(key), value]),
  );
  const mapped: Record<string, unknown> = {};
  const consumed = new Set<string>();

  if (columnMapping) {
    for (const [target, sourceColumn] of Object.entries(columnMapping)) {
      if (!TASK_ALIASES[target] || typeof sourceColumn !== 'string') continue;
      const normalized = normalizeHeader(sourceColumn);
      if (!byHeader.has(normalized)) continue;
      const value = byHeader.get(normalized);
      if (value !== null && value !== '') mapped[target] = value;
      consumed.add(normalized);
    }
    // Context is chosen once in the wizard, not mapped from every source row.
    for (const field of TASK_CONTEXT_FIELDS) {
      if (row[field] !== undefined) mapped[field] = row[field];
      consumed.add(normalizeHeader(field));
    }
  } else {
    // Backward-compatible fallback for direct API callers. The product wizard
    // always supplies an explicit mapping so a guessed alias is never hidden
    // from the supervisor.
    for (const [target, aliases] of Object.entries(TASK_ALIASES)) {
      for (const alias of aliases) {
        const normalized = normalizeHeader(alias);
        if (!byHeader.has(normalized)) continue;
        const value = byHeader.get(normalized);
        if (value !== null && value !== '') mapped[target] = value;
        consumed.add(normalized);
        break;
      }
    }
  }

  for (const coordinate of [
    'latitude',
    'longitude',
    'estimatedMinutes',
  ] as const) {
    if (typeof mapped[coordinate] === 'string')
      mapped[coordinate] = Number(mapped[coordinate]);
  }
  for (const textField of ['externalReferenceId', 'contactPhone'] as const) {
    const value = mapped[textField];
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    mapped[textField] = String(value)
      .trim()
      .replace(/^'(?=[=+\-@])/, '');
  }

  const suppliedCustomFields =
    row.customFields && typeof row.customFields === 'object'
      ? (row.customFields as Record<string, unknown>)
      : {};
  const definitionsBySource = new Map(
    fieldDefinitions.map((field) => [
      normalizeHeader(field.sourceColumn),
      field,
    ]),
  );
  const extraFields: Record<string, unknown> = {};
  for (const [sourceColumn, value] of entries) {
    const normalized = normalizeHeader(sourceColumn);
    if (
      consumed.has(normalized) ||
      normalized === normalizeHeader('customFields')
    )
      continue;
    const definition = definitionsBySource.get(normalized);
    extraFields[definition?.key ?? sourceColumn] = definition
      ? convertCustomValue(value, definition.dataType)
      : value;
  }
  mapped.customFields = { ...extraFields, ...suppliedCustomFields };
  return mapped;
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly repository: ImportsRepository,
    private readonly processor: ImportProcessorService,
    private readonly spreadsheetParser: SpreadsheetParserService,
    private readonly tenantContext: TenantContextService,
    private readonly taskFieldProfiles: TaskFieldProfileService,
  ) {}

  list(page?: number, limit?: number) {
    return this.repository.list(page, limit);
  }

  async taskColumns(uploadId: string) {
    const rows = await this.spreadsheetParser.parseUpload(
      uploadId,
      this.tenantContext.tenantId,
    );
    if (rows.length === 0) throw new BadRequestException('EMPTY_SPREADSHEET');
    const columns: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const column of Object.keys(row)) {
        if (seen.has(column)) continue;
        seen.add(column);
        columns.push(column);
      }
    }
    return { columns, sampleRows: rows.slice(0, 3), totalRows: rows.length };
  }

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
    let taskFields: TaskFieldDefinitionDto[] = [];
    if (dto.entityType === 'tasks' && dto.columnMapping) {
      const headers = [
        ...new Set(rowsInput.flatMap((row) => Object.keys(row))),
      ];
      const normalizedHeaders = new Set(headers.map(normalizeHeader));
      const targets = Object.keys(dto.columnMapping);
      if (targets.some((target) => !TASK_ALIASES[target]))
        throw new BadRequestException('UNKNOWN_TASK_COLUMN_TARGET');
      const mappedSources = Object.values(dto.columnMapping).filter(
        (source): source is string =>
          typeof source === 'string' && Boolean(source),
      );
      if (
        new Set(mappedSources.map(normalizeHeader)).size !==
        mappedSources.length
      )
        throw new BadRequestException('DUPLICATE_TASK_COLUMN_MAPPING');
      for (const target of REQUIRED_TASK_COLUMN_TARGETS) {
        const source = dto.columnMapping[target];
        if (!source?.trim())
          throw new BadRequestException(
            `TASK_COLUMN_MAPPING_REQUIRED:${target}`,
          );
        if (!normalizedHeaders.has(normalizeHeader(source)))
          throw new BadRequestException(
            `TASK_SOURCE_COLUMN_NOT_FOUND:${source}`,
          );
      }

      const mapped = new Set(mappedSources.map(normalizeHeader));
      const configured = new Map(
        (dto.taskProfile?.fields ?? []).map((field) => [
          normalizeHeader(field.sourceColumn),
          field,
        ]),
      );
      taskFields = headers
        .filter((header) => !mapped.has(normalizeHeader(header)))
        .map(
          (header) =>
            configured.get(normalizeHeader(header)) ?? {
              key: header,
              sourceColumn: header,
              label: header,
              dataType: 'text',
              searchable: true,
              filterable: false,
            },
        );

      if (dto.taskProfile) {
        const customerId =
          typeof dto.defaults?.customerId === 'string'
            ? dto.defaults.customerId
            : '';
        const workflowVersionId =
          typeof dto.defaults?.workflowVersionId === 'string'
            ? dto.defaults.workflowVersionId
            : '';
        if (!customerId || !workflowVersionId)
          throw new BadRequestException('TASK_IMPORT_CONTEXT_REQUIRED');
        await this.taskFieldProfiles.upsertFromImport(
          customerId,
          workflowVersionId,
          {
            ...dto.taskProfile,
            columnMapping: dto.columnMapping,
            fields: taskFields,
          },
        );
      }
    }
    const rows: ImportRowOutcome[] = rowsInput.map((row, index) => {
      const withDefaults = { ...(dto.defaults ?? {}), ...row };
      const normalized =
        dto.entityType === 'tasks'
          ? normalizeTaskRow(withDefaults, dto.columnMapping, taskFields)
          : withDefaults;
      const validation = this.processor.validateRow(dto.entityType, normalized);
      return {
        rowNumber: index + 1,
        status: validation.valid ? 'VALID' : 'ERROR',
        errorCode: validation.errorCode,
        message: validation.message,
        rowData: normalized,
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

  async commit(importId: string, previewRevision: number, actorToken?: string) {
    await this.repository.beginCommit(importId, previewRevision);
    const job = await this.repository.findJob(importId);
    const validRows = await this.repository.findRows(importId, 'VALID');
    let valid = 0;
    let errors = 0;
    for (const row of validRows) {
      const result = await this.processor.commitRow(
        job.entityType as
          | 'customers'
          | 'sites'
          | 'service_targets'
          | 'parts'
          | 'users'
          | 'tasks',
        row.rowData,
        job.duplicateMode,
        actorToken,
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
