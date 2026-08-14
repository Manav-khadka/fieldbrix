import { IsUUID } from 'class-validator';

export class MembershipDto {
  @IsUUID()
  userId!: string;
}
