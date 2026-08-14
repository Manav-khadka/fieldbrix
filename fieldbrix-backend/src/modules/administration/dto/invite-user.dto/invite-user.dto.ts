import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class InviteUserDto { @IsEmail() email!: string; @IsOptional() @IsUUID('4') idempotencyKey?: string; }
