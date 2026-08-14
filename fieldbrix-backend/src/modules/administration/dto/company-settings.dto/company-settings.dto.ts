import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class CompanySettingsDto { @IsOptional() @IsString() locale?: string; @IsOptional() @IsString() timezone?: string; @IsOptional() @IsObject() terminology?: Record<string, string>; @IsOptional() @IsArray() workingDays?: number[]; @IsOptional() @IsObject() workingHours?: { start: string; end: string }; @IsOptional() @IsArray() enabledModules?: string[]; }
