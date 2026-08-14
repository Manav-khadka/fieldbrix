import { IsOptional, IsString, MinLength, IsUUID } from 'class-validator';

export class CreateTeamDto { @IsString() @MinLength(2) name!: string; @IsOptional() @IsUUID() leadUserId?: string; }
