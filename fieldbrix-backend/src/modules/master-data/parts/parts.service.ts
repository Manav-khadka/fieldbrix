import { BadRequestException, Injectable } from '@nestjs/common';
import { PartsRepository } from './parts.repository';
import { CreatePartDto, UpdatePartDto } from '../dto/part.dto';
import { ListMasterQueryDto } from '../dto/list-master-query.dto';
import { omit } from '../support/case';

@Injectable()
export class PartsService {
  constructor(private readonly repository: PartsRepository) {}

  list(query: ListMasterQueryDto) {
    return this.repository.list({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  get(id: string) {
    return this.repository.findOrFail(id);
  }

  create(dto: CreatePartDto) {
    if (!dto.name.trim() || !dto.code.trim())
      throw new BadRequestException('NAME_AND_CODE_REQUIRED');
    return this.repository.create({
      ...dto,
      name: dto.name.trim(),
      code: dto.code.trim(),
    });
  }

  update(id: string, dto: UpdatePartDto) {
    if (dto.archived) {
      if (dto.revision === undefined)
        throw new BadRequestException('REVISION_REQUIRED_FOR_ARCHIVE');
      return this.repository.archive(id, dto.revision);
    }
    return this.repository.update(
      id,
      omit(dto, ['revision', 'archived']),
      dto.revision,
    );
  }
}
