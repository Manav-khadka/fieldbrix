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
] as const;
export type ImportableEntityType = (typeof IMPORTABLE_ENTITY_TYPES)[number];

export class ImportPreviewDto {
  @IsIn(IMPORTABLE_ENTITY_TYPES) entityType: ImportableEntityType;
  @IsArray() rows: Array<Record<string, unknown>>;
  @IsOptional() @IsIn(['reject', 'skip', 'update']) duplicateMode?:
    'reject' | 'skip' | 'update';
  @IsOptional() @IsUUID() uploadId?: string;
  @IsOptional() @IsString() sourceChecksum?: string;
}

export class ImportCommitDto {
  @IsOptional() @IsInt() @Min(1) previewRevision?: number;
}
