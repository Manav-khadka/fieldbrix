import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CustomerConfirmationDto {
  @IsEnum(['SIGNED', 'REFUSED', 'UNAVAILABLE'])
  status!: 'SIGNED' | 'REFUSED' | 'UNAVAILABLE';

  @IsOptional()
  @IsString()
  signerName?: string;

  @IsOptional()
  @IsString()
  signerDesignation?: string;

  @IsString()
  @IsNotEmpty()
  summaryHash!: string;

  @IsOptional()
  @IsString()
  signatureUploadId?: string;

  @IsOptional()
  @IsString()
  refusalReason?: string;

  @IsOptional()
  @IsBoolean()
  workerDeclaration?: boolean;
}

export class TaskReviewDecisionDto {
  @IsEnum(['APPROVED', 'CORRECTION_REQUIRED', 'REJECTED'])
  status!: 'APPROVED' | 'CORRECTION_REQUIRED' | 'REJECTED';

  @IsOptional()
  exceptionDecisions?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsUUID()
  followUpTaskId?: string;
}

export class CreateFollowUpDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
