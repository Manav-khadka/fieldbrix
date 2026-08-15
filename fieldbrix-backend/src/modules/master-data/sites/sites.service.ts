import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { SitesRepository } from './sites.repository';
import { CreateSiteDto, UpdateSiteDto } from '../dto/site.dto';
import { ListSitesQueryDto } from '../dto/list-master-query.dto';
import { omit } from '../support/case';

@Injectable()
export class SitesService {
  constructor(private readonly repository: SitesRepository) {}

  list(query: ListSitesQueryDto) {
    const filters = query.customerId
      ? [{ column: 'customer_id', value: query.customerId, uuid: true }]
      : [];
    return this.repository.list(
      { search: query.search, page: query.page, limit: query.limit },
      filters,
    );
  }

  get(id: string) {
    return this.repository.findOrFail(id);
  }

  async create(dto: CreateSiteDto) {
    if (!dto.name.trim() || !dto.code.trim())
      throw new BadRequestException('NAME_AND_CODE_REQUIRED');
    if (!(await this.repository.customerExists(dto.customerId)))
      throw new BadRequestException('CUSTOMER_NOT_FOUND');
    return this.repository.create({
      ...dto,
      name: dto.name.trim(),
      code: dto.code.trim(),
    });
  }

  async update(id: string, dto: UpdateSiteDto) {
    if (dto.archived) {
      if (dto.revision === undefined)
        throw new BadRequestException('REVISION_REQUIRED_FOR_ARCHIVE');
      if (await this.repository.hasActiveServiceTargets(id))
        throw new ConflictException('SITE_HAS_ACTIVE_SERVICE_TARGETS');
      return this.repository.archive(id, dto.revision);
    }
    return this.repository.update(
      id,
      omit(dto, ['revision', 'archived']),
      dto.revision,
    );
  }
}
