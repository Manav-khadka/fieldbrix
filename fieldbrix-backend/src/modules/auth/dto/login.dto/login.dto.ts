import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @MinLength(1) identifier!: string;
  @IsString() @MinLength(10) password!: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) deviceName?: string;
}
