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
import { TaskService } from './task.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from './task.dto';

@Controller()
@UseGuards(PermissionGuard)
export class TaskController {
  constructor(
    private readonly tasks: TaskService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('tasks.view')
  @Get('tasks')
  list(@Query() query: ListTasksQueryDto) {
    return this.tasks.list(query);
  }

  @Permission('tasks.create')
  @Post('tasks')
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateTaskDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', '/tasks', body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.tasks.create(body))
      .then((r) => r.response);
  }

  @Permission('tasks.view')
  @Get('tasks/:id')
  get(@Param('id') id: string) {
    return this.tasks.get(id);
  }

  @Permission('tasks.edit')
  @Patch('tasks/:id')
  update(@Param('id') id: string, @Body() body: UpdateTaskDto) {
    return this.tasks.update(id, body);
  }
}
