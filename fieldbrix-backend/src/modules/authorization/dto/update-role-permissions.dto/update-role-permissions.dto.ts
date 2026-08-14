import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionGrantDto } from '../permission-grant.dto/permission-grant.dto';

export class UpdateRolePermissionsDto { @IsArray() @ArrayUnique() @IsString({ each: true }) permissions!: string[]; @IsOptional() @IsArray() @Type(() => PermissionGrantDto) grants?: PermissionGrantDto[]; @IsOptional() @IsInt() @Min(1) revision?: number; }
