import { IsString, Matches } from 'class-validator';

export class CompleteUploadDto {
  @IsString() @Matches(/^[A-Za-z0-9+/]{43}=$/) checksum!: string;
}
