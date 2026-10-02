import {
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsNotEmpty() @IsString() workflowVersionId!: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() siteId?: string;
  @IsOptional() @IsString() targetId?: string;
  /** Client-owned reference used to make imports idempotent and searchable. */
  @IsOptional() @IsString() externalReferenceId?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  /** Workflow/client-specific source columns that are not core task fields. */
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
  /** Complaint/work type — e.g. "PREVENTIVE", "CORRECTIVE", "COMPLAINT". */
  @IsOptional() @IsString() workType?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() dueAt?: string;
  @IsOptional() @Type(() => Number) estimatedMinutes?: number;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsObject() signaturePolicy?: { required: boolean };
}

export class UpdateTaskDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() dueAt?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
  @IsOptional() @IsInt() revision?: number;
}

export class ListTasksQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() workflowId?: string;
  @IsOptional() @IsString() siteId?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() customField?: string;
  @IsOptional() @IsString() customValue?: string;
  @IsOptional() @IsIn(['contains', 'equals']) customOperator?:
    'contains' | 'equals';
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}

export class TaskAssignmentDto {
  @IsOptional() @IsString() workerId?: string;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsBoolean() lead?: boolean;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) supervisorIds?: string[];
  @IsOptional()
  @IsIn(['AUTO', 'MANUAL_SUPERVISOR', 'QUALITY_DEPARTMENT'])
  verificationMode?: 'AUTO' | 'MANUAL_SUPERVISOR' | 'QUALITY_DEPARTMENT';
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  requiredApprovals?: number;
  @IsOptional() @IsString() qualityTeamId?: string;
}

export class TaskTransitionDto {
  @IsNotEmpty() @IsString() targetStatus!: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsInt() revision?: number;
}

export class TaskAttachmentDto {
  @IsNotEmpty() @IsString() uploadId!: string;
  @IsOptional() @IsString() category?: string;
}

export class TaskActionRequestDto {
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() preferredReplacementId?: string;
}
