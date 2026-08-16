import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkflowDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() category?: string;
}

export class UpdateWorkflowDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsInt() revision?: number;
}

export class CreateSectionDto {
  @IsNotEmpty() @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Type(() => Number) position?: number;
}

export class UpdateSectionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Type(() => Number) position?: number;
  @IsOptional() @IsInt() revision?: number;
}

export class CreateFieldDto {
  @IsNotEmpty() @IsString() key!: string;
  @IsNotEmpty() @IsString() type!: string;
  @IsNotEmpty() @IsString() label!: string;
  @IsOptional() @IsString() help?: string;
  @IsOptional() sectionId?: string;
  @IsOptional() required?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) position?: number;
  @IsOptional() config?: Record<string, unknown>;
}

export class UpdateFieldDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() help?: string;
  @IsOptional() required?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) position?: number;
  @IsOptional() config?: Record<string, unknown>;
  @IsOptional() @IsInt() revision?: number;
}

export class ReorderDto {
  @IsOptional() sectionOrder?: string[];
  @IsOptional() fieldOrder?: Record<string, string[]>;
  @IsInt() @Min(1) revision!: number;
}

export class PublishWorkflowDto {
  @IsOptional() @IsString() notes?: string;
  @IsInt() @Min(1) revision!: number;
}

export class DuplicateWorkflowDto {
  @IsOptional() @IsString() name?: string;
}

export class ArchiveWorkflowDto {
  @IsOptional() @IsString() reason?: string;
  @IsInt() @Min(1) revision!: number;
}

export class WorkflowQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}

export class CreateTemplateDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() industry?: string;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() schema?: Record<string, unknown>;
  @IsOptional() archived?: boolean;
  @IsInt() @Min(1) revision!: number;
}
