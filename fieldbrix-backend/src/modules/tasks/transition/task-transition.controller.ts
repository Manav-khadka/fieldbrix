import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { TaskTransitionService } from './task-transition.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import { TaskTransitionDto } from '../task/task.dto';

@Controller()
@UseGuards(PermissionGuard)
export class TaskTransitionController {
  constructor(
    private readonly transitions: TaskTransitionService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('tasks.edit')
  @Post('tasks/:id/transitions')
  transition(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TaskTransitionDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', `/tasks/${id}/transitions`, body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.transitions.transition(id, body.targetStatus, body.reason, body.revision))
      .then((r) => r.response);
  }

  @Permission('tasks.cancel')
  @Post('tasks/:id/cancel')
  cancel(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { reason?: string; revision?: number },
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', `/tasks/${id}/cancel`, body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.transitions.cancel(id, body.reason, body.revision))
      .then((r) => r.response);
  }

  @Permission('tasks.reopen')
  @Post('tasks/:id/reopen')
  reopen(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { reason?: string; revision?: number },
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', `/tasks/${id}/reopen`, body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.transitions.reopen(id, body.reason, body.revision))
      .then((r) => r.response);
  }
}
