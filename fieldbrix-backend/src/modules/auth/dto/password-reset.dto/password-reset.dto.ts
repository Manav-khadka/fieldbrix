import { IsString, MinLength } from 'class-validator';

export class PasswordResetDto {
  @IsString() @MinLength(20) token!: string;
  @IsString() @MinLength(10) password!: string;
}
