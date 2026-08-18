import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RecurrenceService } from './recurrence.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import {
  CreateRecurrenceDto,
  RecurrenceExceptionDto,
  UpdateRecurrenceDto,
} from './recurrence.dto';

@Controller('recurrences')
@UseGuards(PermissionGuard)
export class RecurrenceController {
  constructor(
    private readonly recurrenceService: RecurrenceService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('tasks.view')
  @Get()
  list() {
    return this.recurrenceService.list();
  }

  @Permission('tasks.view')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.recurrenceService.get(id);
  }

  @Permission('tasks.create')
  @Post()
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateRecurrenceDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', '/recurrences', body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.recurrenceService.create(body))
      .then((res) => res.response);
  }

  @Permission('tasks.edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateRecurrenceDto) {
    return this.recurrenceService.update(id, body);
  }

  @Permission('tasks.edit')
  @Post(':id/exceptions')
  handleException(
    @Param('id') id: string,
    @Body() body: RecurrenceExceptionDto,
  ) {
    return this.recurrenceService.handleException(id, body);
  }
}
