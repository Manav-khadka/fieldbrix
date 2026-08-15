import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';
import { ListMasterQueryDto } from '../dto/list-master-query.dto';
import { omit } from '../support/case';

@Injectable()
export class CustomersService {
  constructor(private readonly repository: CustomersRepository) {}

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

  create(dto: CreateCustomerDto) {
    if (!dto.name.trim() || !dto.code.trim())
      throw new BadRequestException('NAME_AND_CODE_REQUIRED');
    return this.repository.create({
      ...dto,
      name: dto.name.trim(),
      code: dto.code.trim(),
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    if (dto.archived) {
      if (dto.revision === undefined)
        throw new BadRequestException('REVISION_REQUIRED_FOR_ARCHIVE');
      if (await this.repository.hasActiveSites(id))
        throw new ConflictException('CUSTOMER_HAS_ACTIVE_SITES');
      return this.repository.archive(id, dto.revision);
    }
    return this.repository.update(
      id,
      omit(dto, ['revision', 'archived']),
      dto.revision,
    );
  }
}
