import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TenantReasonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
