import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class StartTaskRunDto {
  @IsOptional()
  checkInGps?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  targetMatchStatus?: string;
}

export class SubmitAnswersDto {
  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @IsString()
  @IsNotEmpty()
  fieldKey!: string;

  @IsNotEmpty()
  value!: unknown;

  @IsOptional()
  @IsString()
  validationOutcome?: string;
}

export class RecordPartUsedDto {
  @IsOptional()
  @IsUUID()
  partId?: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsOptional()
  @IsBoolean()
  oldPartReturned?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordEvidenceDto {
  @IsString()
  @IsNotEmpty()
  uploadId!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  geoLocation?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RegisterTargetDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  @IsNotEmpty()
  qrIdentity!: string;

  @IsString()
  @IsNotEmpty()
  equipmentName!: string;

  @IsOptional()
  @IsString()
  equipmentType?: string;
}
