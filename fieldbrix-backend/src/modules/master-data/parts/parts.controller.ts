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
import { PartsService } from './parts.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { CreatePartDto, UpdatePartDto } from '../dto/part.dto';
import { ListMasterQueryDto } from '../dto/list-master-query.dto';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Controller('parts')
@UseGuards(PermissionGuard)
export class PartsController {
  constructor(
    private readonly parts: PartsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('master.parts.view')
  @Get()
  list(@Query() query: ListMasterQueryDto) {
    return this.parts.list(query);
  }

  @Permission('master.parts.view')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.parts.get(id);
  }

  @Permission('master.parts.create')
  @Post()
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: CreatePartDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fingerprint = this.idempotency.fingerprint('POST', '/parts', body);
    return this.idempotency
      .getOrCreateAsync(key, fingerprint, () => this.parts.create(body))
      .then((result) => result.response);
  }

  @Permission('master.parts.edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdatePartDto) {
    return this.parts.update(id, body);
  }
}
