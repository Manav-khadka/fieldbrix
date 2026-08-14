import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  revision?: number;
}
