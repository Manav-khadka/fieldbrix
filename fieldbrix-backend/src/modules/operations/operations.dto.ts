import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class MasterRecordDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsString() @MinLength(2) @MaxLength(80) code!: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() siteId?: string;
  @IsOptional() @IsString() qrIdentity?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsDateString() nextDue?: string;
}

export class WorkflowDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) revision?: number;
}

export class PublishWorkflowDto {
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @Type(() => Number) @IsInt() @Min(1) revision!: number;
}

export class WorkflowElementDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() key?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() options?: unknown[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) revision?: number;
}

export class TaskDto {
  @IsUUID() workflowVersionId!: string;
  @IsUUID() customerId!: string;
  @IsUUID() siteId!: string;
  @IsOptional() @IsUUID() targetId?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsString() @MaxLength(4000) instructions?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) estimatedMinutes?: number;
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) revision?: number;
}

export class TaskTransitionDto {
  @IsString() @IsIn(['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED', 'REOPENED']) targetStatus!: string;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @Type(() => Number) @IsInt() @Min(1) revision!: number;
}

export class TaskAssignmentDto {
  @IsOptional() @IsUUID() workerId?: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() lead?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class TaskAttachmentDto {
  @IsUUID() uploadId!: string;
  @IsString() @MinLength(2) @MaxLength(60) category!: string;
}

export class ImportPreviewDto {
  @IsIn(['users', 'customers', 'sites', 'service_targets', 'parts']) entityType!: string;
  @IsArray() @IsObject({ each: true }) rows!: Array<Record<string, unknown>>;
  @IsOptional() @IsIn(['reject', 'skip', 'update']) duplicateMode?: 'reject' | 'skip' | 'update';
  @IsOptional() @IsUUID() uploadId?: string;
  @IsOptional() @IsString() @MaxLength(128) sourceChecksum?: string;
}
