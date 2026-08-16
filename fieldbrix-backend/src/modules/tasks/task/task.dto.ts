import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsNotEmpty() @IsString() workflowVersionId!: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() siteId?: string;
  @IsOptional() @IsString() targetId?: string;
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
  @IsOptional() @IsInt() revision?: number;
}

export class ListTasksQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() siteId?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}

export class TaskAssignmentDto {
  @IsOptional() @IsString() workerId?: string;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() lead?: boolean;
  @IsOptional() @IsString() reason?: string;
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
