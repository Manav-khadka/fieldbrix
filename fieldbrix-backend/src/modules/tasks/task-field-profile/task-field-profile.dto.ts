import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsObject,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export const TASK_FIELD_DATA_TYPES = [
  'text',
  'number',
  'boolean',
  'date',
] as const;
export type TaskFieldDataType = (typeof TASK_FIELD_DATA_TYPES)[number];

export class TaskFieldDefinitionDto {
  @IsString() @Length(1, 200) key!: string;
  @IsString() @Length(1, 200) sourceColumn!: string;
  @IsString() @Length(1, 120) label!: string;
  @IsIn(TASK_FIELD_DATA_TYPES) dataType!: TaskFieldDataType;
  @IsBoolean() searchable!: boolean;
  @IsBoolean() filterable!: boolean;
}

export class UpsertTaskFieldProfileDto {
  @IsString() customerId!: string;
  @IsString() workflowId!: string;
  @IsString() @Length(1, 40) entityLabel!: string;
  @IsObject() columnMapping!: Record<string, string>;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskFieldDefinitionDto)
  fields!: TaskFieldDefinitionDto[];
  @IsArray() @IsString({ each: true }) visibleColumns!: string[];
}

export class ListTaskFieldProfilesQueryDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() workflowId?: string;
}
