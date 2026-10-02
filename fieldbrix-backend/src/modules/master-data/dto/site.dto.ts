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
  @IsOptional() @IsString() siteType?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() serviceZone?: string;
  @IsOptional() @IsString() operatingHours?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
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
  @IsOptional() @IsString() siteType?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() serviceZone?: string;
  @IsOptional() @IsString() operatingHours?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) revision?: number;
  @IsOptional() @IsBoolean() archived?: boolean;
}
