import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() alternatePhone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() serviceTier?: string;
  @IsOptional() @IsString() accountManager?: string;
  @IsOptional() @IsString() contractStart?: string;
  @IsOptional() @IsString() contractEnd?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() alternatePhone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() serviceTier?: string;
  @IsOptional() @IsString() accountManager?: string;
  @IsOptional() @IsString() contractStart?: string;
  @IsOptional() @IsString() contractEnd?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) revision?: number;
  @IsOptional() @IsBoolean() archived?: boolean;
}
