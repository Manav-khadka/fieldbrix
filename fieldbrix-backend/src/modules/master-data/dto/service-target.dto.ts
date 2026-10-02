import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateServiceTargetDto {
  @IsUUID() siteId: string;
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() equipmentType?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsObject() warranty?: Record<string, unknown>;
  @IsOptional() @IsObject() coverage?: Record<string, unknown>;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsDateString() nextDue?: string;
  @IsOptional() @IsObject() evidence?: Record<string, unknown>;
  @IsOptional() @IsString() assetCategory?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() installationDate?: string;
  @IsOptional() @IsDateString() warrantyEnd?: string;
  @IsOptional() @IsInt() @Min(1) serviceFrequencyDays?: number;
  @IsOptional() @IsString() criticality?: string;
  @IsOptional() @IsString() assetStatus?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
}

export class UpdateServiceTargetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() equipmentType?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsObject() warranty?: Record<string, unknown>;
  @IsOptional() @IsObject() coverage?: Record<string, unknown>;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsDateString() nextDue?: string;
  @IsOptional() @IsObject() evidence?: Record<string, unknown>;
  @IsOptional() @IsString() assetCategory?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() installationDate?: string;
  @IsOptional() @IsDateString() warrantyEnd?: string;
  @IsOptional() @IsInt() @Min(1) serviceFrequencyDays?: number;
  @IsOptional() @IsString() criticality?: string;
  @IsOptional() @IsString() assetStatus?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) revision?: number;
  @IsOptional() @IsBoolean() archived?: boolean;
}
