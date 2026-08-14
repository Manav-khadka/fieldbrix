import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UploadIntentDto {
  @IsString() @IsNotEmpty() @MaxLength(120) mime!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(25 * 1024 * 1024) size!: number;
  @IsString() @Matches(/^[A-Za-z0-9+/]{43}=$/) checksum!: string;
}
