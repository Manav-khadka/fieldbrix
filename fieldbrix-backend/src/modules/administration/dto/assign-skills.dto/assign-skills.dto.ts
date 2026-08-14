import { IsArray, IsString } from 'class-validator';

export class AssignSkillsDto {
  @IsArray()
  @IsString({ each: true })
  skillIds!: string[];
}
