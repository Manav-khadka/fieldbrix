import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceTargetsRepository } from './service-targets.repository';
import { QrIdentityService } from './qr-identity.service';
import {
  CreateServiceTargetDto,
  UpdateServiceTargetDto,
} from '../dto/service-target.dto';
import { ListServiceTargetsQueryDto } from '../dto/list-master-query.dto';
import { omit } from '../support/case';

@Injectable()
export class ServiceTargetsService {
  constructor(
    private readonly repository: ServiceTargetsRepository,
    private readonly qrIdentity: QrIdentityService,
  ) {}

  list(query: ListServiceTargetsQueryDto) {
    const filters = query.siteId
      ? [{ column: 'site_id', value: query.siteId, uuid: true }]
      : [];
    return this.repository.list(
      { search: query.search, page: query.page, limit: query.limit },
      filters,
    );
  }

  get(id: string) {
    return this.repository.findOrFail(id);
  }

  async create(dto: CreateServiceTargetDto) {
    if (!dto.name.trim() || !dto.code.trim())
      throw new BadRequestException('NAME_AND_CODE_REQUIRED');
    if (!(await this.repository.siteExists(dto.siteId)))
      throw new BadRequestException('SITE_NOT_FOUND');
    return this.repository.create({
      ...dto,
      name: dto.name.trim(),
      code: dto.code.trim(),
      qrIdentity: this.qrIdentity.generate(),
    });
  }

  async update(id: string, dto: UpdateServiceTargetDto) {
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

  async resolveQr(code: string) {
    if (!this.qrIdentity.isValid(code))
      throw new NotFoundException('QR_NOT_FOUND');
    return this.repository.resolveByQrIdentity(code);
  }
}
