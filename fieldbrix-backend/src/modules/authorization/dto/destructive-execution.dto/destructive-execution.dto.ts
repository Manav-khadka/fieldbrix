import { IsObject } from 'class-validator';

export class DestructiveExecutionDto {
  @IsObject()
  payload!: Record<string, unknown>;
}
