import { IsString, MinLength, MaxLength } from 'class-validator';

export class InvitationAcceptDto {
  @IsString()
  @MinLength(10)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;
}
