import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GodSessionDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  reauthSecret!: string;
}
