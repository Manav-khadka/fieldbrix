import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'ARCHIVED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}
