import { IsOptional, IsString, MinLength, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() cloneFrom?: string;
  @IsOptional() @IsUUID('4') idempotencyKey?: string;
}
