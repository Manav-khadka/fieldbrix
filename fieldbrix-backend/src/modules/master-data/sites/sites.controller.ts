import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { CreateSiteDto, UpdateSiteDto } from '../dto/site.dto';
import { ListSitesQueryDto } from '../dto/list-master-query.dto';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Controller('sites')
@UseGuards(PermissionGuard)
export class SitesController {
  constructor(
    private readonly sites: SitesService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('master.sites.view')
  @Get()
  list(@Query() query: ListSitesQueryDto) {
    return this.sites.list(query);
  }

  @Permission('master.sites.view')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.sites.get(id);
  }

  @Permission('master.sites.create')
  @Post()
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateSiteDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fingerprint = this.idempotency.fingerprint('POST', '/sites', body);
    return this.idempotency
      .getOrCreateAsync(key, fingerprint, () => this.sites.create(body))
      .then((result) => result.response);
  }

  @Permission('master.sites.edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateSiteDto) {
    return this.sites.update(id, body);
  }
}
