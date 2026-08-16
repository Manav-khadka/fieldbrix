import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CompanySettingsDto {
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsObject() terminology?: Record<string, string>;
  @IsOptional() @IsArray() workingDays?: number[];
  @IsOptional() @IsObject() workingHours?: { start: string; end: string };
  @IsOptional() @IsArray() enabledModules?: string[];
  @IsOptional() @IsString() contactFooter?: string;
  @IsOptional() @IsString() reportFooter?: string;
  @IsOptional() @IsInt() @Min(5) @Max(2000) gpsRadiusMeters?: number;
  @IsOptional() @IsObject() signaturePolicy?: { required: boolean };
  @IsOptional()
  @IsObject()
  refusalPolicy?: { allowed: boolean; requireReason: boolean };
  @IsOptional()
  @IsObject()
  unavailablePolicy?: { allowed: boolean; requireReason: boolean };
  @IsOptional()
  @IsObject()
  approvalPolicy?: { required: boolean; approverRoleKey?: string };
  @IsOptional() @IsObject() latePolicy?: { graceMinutes: number };
  @IsOptional() @IsObject() exceptionPolicy?: { requireReason: boolean };
  @IsOptional() @IsString() colorTheme?: string;
  @IsOptional() @IsString() dateFormat?: string;
  @IsOptional() @IsString() numberFormat?: string;
  /** Object-storage key of a logo already uploaded via /files/upload-intents. */
  @IsOptional() @IsString() logoObjectKey?: string;
}
