import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SupportNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  note!: string;
}
