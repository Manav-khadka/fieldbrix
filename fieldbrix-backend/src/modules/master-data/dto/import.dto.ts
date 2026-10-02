import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskFieldDefinitionDto } from '../../tasks/task-field-profile/task-field-profile.dto';

export const IMPORTABLE_ENTITY_TYPES = [
  'customers',
  'sites',
  'service_targets',
  'parts',
  'users',
  'tasks',
] as const;
export type ImportableEntityType = (typeof IMPORTABLE_ENTITY_TYPES)[number];

export class ListImportsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 10;
}

export class TaskImportProfileDto {
  @IsString() entityLabel!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskFieldDefinitionDto)
  fields!: TaskFieldDefinitionDto[];
  @IsArray() @IsString({ each: true }) visibleColumns!: string[];
}

export class TaskImportColumnsDto {
  @IsUUID() uploadId!: string;
}

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
  /** Values selected once in the import wizard and applied to every row. */
  @IsOptional() @IsObject() defaults?: Record<string, unknown>;
  /** Canonical task field -> exact source spreadsheet heading. */
  @IsOptional() @IsObject() columnMapping?: Record<string, string>;
  /** Client/workflow vocabulary and presentation metadata captured by the wizard. */
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskImportProfileDto)
  taskProfile?: TaskImportProfileDto;
}

export class ImportCommitDto {
  @IsOptional() @IsInt() @Min(1) previewRevision?: number;
}
