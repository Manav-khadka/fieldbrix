import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class DestructiveRequestDto {
  @IsString()
  @IsNotEmpty()
  godSessionId!: string;

  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  action!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  targetId!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
