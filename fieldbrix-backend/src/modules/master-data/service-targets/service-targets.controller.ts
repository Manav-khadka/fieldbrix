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
import { ServiceTargetsService } from './service-targets.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import {
  CreateServiceTargetDto,
  UpdateServiceTargetDto,
} from '../dto/service-target.dto';
import { ListServiceTargetsQueryDto } from '../dto/list-master-query.dto';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Controller()
@UseGuards(PermissionGuard)
export class ServiceTargetsController {
  constructor(
    private readonly targets: ServiceTargetsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('master.targets.view')
  @Get('service-targets')
  list(@Query() query: ListServiceTargetsQueryDto) {
    return this.targets.list(query);
  }

  @Permission('master.targets.view')
  @Get('service-targets/:id')
  get(@Param('id') id: string) {
    return this.targets.get(id);
  }

  @Permission('master.targets.create')
  @Post('service-targets')
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateServiceTargetDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/service-targets',
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fingerprint, () => this.targets.create(body))
      .then((result) => result.response);
  }

  @Permission('master.targets.edit')
  @Patch('service-targets/:id')
  update(@Param('id') id: string, @Body() body: UpdateServiceTargetDto) {
    return this.targets.update(id, body);
  }

  @Permission('master.targets.view')
  @Get('qr-identities/:code/resolve')
  resolveQr(@Param('code') code: string) {
    return this.targets.resolveQr(code);
  }
}
