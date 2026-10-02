import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TaskAssignmentService } from './task-assignment.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import { TaskAssignmentDto } from '../task/task.dto';
import { PlatformService } from '../../platform/platform/platform.service';
import { UnauthorizedException } from '@nestjs/common';

@Controller()
@UseGuards(PermissionGuard)
export class TaskAssignmentController {
  constructor(
    private readonly assignments: TaskAssignmentService,
    private readonly idempotency: IdempotencyService,
    private readonly platform: PlatformService,
  ) {}

  private actorId(headers: Record<string, string>) {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    return this.platform.requireUser(token).id;
  }

  @Permission('tasks.view')
  @Get('tasks/:id/assignments')
  current(@Param('id') id: string) {
    return this.assignments.current(id);
  }

  @Permission('tasks.assign')
  @Post('tasks/:id/assignments')
  assign(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TaskAssignmentDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/tasks/${id}/assignments`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () =>
        this.assignments.assign(id, body, this.actorId(headers)),
      )
      .then((r) => r.response);
  }

  @Permission('tasks.assign')
  @Post('tasks/:id/reassign')
  reassign(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TaskAssignmentDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/tasks/${id}/reassign`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () =>
        this.assignments.reassign(
          id,
          { ...body, reason: body.reason },
          this.actorId(headers),
        ),
      )
      .then((r) => r.response);
  }
}
