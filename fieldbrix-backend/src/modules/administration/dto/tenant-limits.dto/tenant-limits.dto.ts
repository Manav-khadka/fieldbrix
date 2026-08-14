import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class TenantLimitsDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  users!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  branches!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  tasks!: number;
}
