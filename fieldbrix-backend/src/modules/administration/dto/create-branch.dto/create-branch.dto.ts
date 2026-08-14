import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBranchDto { @IsString() @MinLength(2) name!: string; @IsOptional() @IsString() timezone?: string; }
