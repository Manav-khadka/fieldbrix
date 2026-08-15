import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListMasterQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
}

export class ListSitesQueryDto extends ListMasterQueryDto {
  @IsOptional() @IsUUID() customerId?: string;
}

export class ListServiceTargetsQueryDto extends ListMasterQueryDto {
  @IsOptional() @IsUUID() siteId?: string;
}
