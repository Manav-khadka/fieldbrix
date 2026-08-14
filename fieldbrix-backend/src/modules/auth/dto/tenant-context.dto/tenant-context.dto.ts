import { IsNotEmpty, IsString } from 'class-validator';

export class TenantContextDto {
  @IsString()
  @IsNotEmpty()
  membershipId!: string;
}
