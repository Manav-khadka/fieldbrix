import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export const IMPORTABLE_ENTITY_TYPES = [
  'customers',
  'sites',
  'service_targets',
  'parts',
  'users',
] as const;
export type ImportableEntityType = (typeof IMPORTABLE_ENTITY_TYPES)[number];

export class ImportPreviewDto {
  @IsIn(IMPORTABLE_ENTITY_TYPES) entityType: ImportableEntityType;
  // Either rows (client already parsed the spreadsheet) or uploadId (server
  // parses a previously-uploaded CSV/XLSX file) must be supplied — enforced
  // in ImportsService.preview, not here, since it's a cross-field rule.
  @IsOptional() @IsArray() rows?: Array<Record<string, unknown>>;
  @IsOptional() @IsIn(['reject', 'skip', 'update']) duplicateMode?:
    'reject' | 'skip' | 'update';
  @IsOptional() @IsUUID() uploadId?: string;
  @IsOptional() @IsString() sourceChecksum?: string;
}

export class ImportCommitDto {
  @IsOptional() @IsInt() @Min(1) previewRevision?: number;
}
