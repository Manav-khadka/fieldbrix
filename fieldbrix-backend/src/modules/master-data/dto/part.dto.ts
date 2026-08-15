import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePartDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsString() unit: string;
  @IsOptional() @IsArray() compatibility?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePartDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsArray() compatibility?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(1) revision?: number;
  @IsOptional() @IsBoolean() archived?: boolean;
}
