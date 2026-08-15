import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSiteDto {
  @IsUUID() customerId: string;
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsObject() gps?: { lat: number; lng: number };
  @IsOptional() @IsObject() geofence?: Record<string, unknown>;
  @IsOptional() @IsString() accessNotes?: string;
  @IsOptional() @IsString() parkingNotes?: string;
  @IsOptional() @IsObject() hours?: Record<string, unknown>;
  @IsOptional() @IsString() safetyNotes?: string;
}

export class UpdateSiteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsObject() gps?: { lat: number; lng: number };
  @IsOptional() @IsObject() geofence?: Record<string, unknown>;
  @IsOptional() @IsString() accessNotes?: string;
  @IsOptional() @IsString() parkingNotes?: string;
  @IsOptional() @IsObject() hours?: Record<string, unknown>;
  @IsOptional() @IsString() safetyNotes?: string;
  @IsOptional() @IsInt() @Min(1) revision?: number;
  @IsOptional() @IsBoolean() archived?: boolean;
}
