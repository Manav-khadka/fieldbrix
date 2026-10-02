import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum WorkforceType {
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  OFFICE = 'OFFICE',
  FIELD_WORKER = 'FIELD_WORKER',
  SUPERVISOR = 'SUPERVISOR',
  QUALITY_REVIEWER = 'QUALITY_REVIEWER',
}

export enum WorkflowAccessLevel {
  PERFORM = 'PERFORM',
  SUPERVISE = 'SUPERVISE',
  VERIFY = 'VERIFY',
}

export class UpdateWorkforceProfileDto {
  @IsString() jobTitle!: string;
  @IsEnum(WorkforceType) workforceType!: WorkforceType;
  @IsOptional() @IsUUID() primaryTeamId?: string;
  @IsBoolean() canReceiveTasks!: boolean;
  @IsBoolean() canAssignTasks!: boolean;
  @IsBoolean() canVerifyTasks!: boolean;
  @IsArray() @ArrayMaxSize(200) workflowAccess!: Array<{
    workflowId: string;
    accessLevel: WorkflowAccessLevel;
  }>;
}

export class UpdateDepartmentGovernanceDto {
  @IsOptional() @IsString() departmentLabel?: string;
  @IsEnum(['AUTO', 'MANUAL_SUPERVISOR', 'QUALITY_DEPARTMENT'])
  verificationMode!: 'AUTO' | 'MANUAL_SUPERVISOR' | 'QUALITY_DEPARTMENT';
  @IsInt() @Min(1) @Max(20) requiredApprovals!: number;
  @IsArray() @IsUUID('4', { each: true }) supervisorIds!: string[];
  @IsArray() @IsUUID('4', { each: true }) qualityReviewerIds!: string[];
  @IsArray() @IsUUID('4', { each: true }) workflowIds!: string[];
}

export class CreatePlatformStaffDto {
  @IsEmail() email!: string;
  @IsString() displayName!: string;
  @IsEnum(['SUPER_ADMIN', 'SUB_ADMIN'])
  accessLevel!: 'SUPER_ADMIN' | 'SUB_ADMIN';
  @IsArray() @IsString({ each: true }) capabilities!: string[];
}
