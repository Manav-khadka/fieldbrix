import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRecurrenceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(['DAILY', 'WEEKDAY', 'WEEKLY', 'MONTHLY', 'CUSTOM'])
  frequency!: 'DAILY' | 'WEEKDAY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  lookaheadDays?: number;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsUUID()
  workflowVersionId!: string;

  @IsOptional()
  @IsUUID()
  defaultAssigneeId?: string;

  @IsOptional()
  @IsUUID()
  defaultTeamId?: string;

  @IsOptional()
  @IsBoolean()
  lead?: boolean;

  @IsOptional()
  @IsIn(['CRITICAL', 'HIGH', 'NORMAL', 'LOW'])
  priority?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateRecurrenceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  lookaheadDays?: number;

  @IsOptional()
  @IsUUID()
  defaultAssigneeId?: string;

  @IsOptional()
  @IsUUID()
  defaultTeamId?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  revision?: number;
}

export class RecurrenceExceptionDto {
  @IsDateString()
  occurrenceDate!: string;

  @IsEnum(['SKIP', 'RESCHEDULE'])
  action!: 'SKIP' | 'RESCHEDULE';

  @IsOptional()
  @IsDateString()
  newDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
