import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SyncMutationItemDto {
  @IsUUID()
  clientMutationId!: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsNotEmpty()
  payload!: Record<string, unknown>;

  @IsDateString()
  clientOccurredAt!: string;
}

export class SyncBatchDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncMutationItemDto)
  mutations!: SyncMutationItemDto[];
}
