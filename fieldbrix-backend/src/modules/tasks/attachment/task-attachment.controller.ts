import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import { TaskAttachmentService } from './task-attachment.service';
import { TaskAttachmentDto, TaskActionRequestDto } from '../task/task.dto';

@Controller()
@UseGuards(PermissionGuard)
export class TaskAttachmentController {
  constructor(
    private readonly attachments: TaskAttachmentService,
    private readonly idempotency: IdempotencyService,
  ) {}

  /** POST /tasks/:id/attachments — link a pre-uploaded file to the task */
  @Permission('tasks.edit')
  @Post('tasks/:id/attachments')
  addAttachment(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TaskAttachmentDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/tasks/${id}/attachments`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () =>
        this.attachments.createAttachment(id, body),
      )
      .then((r) => r.response);
  }

  /** POST /tasks/:id/action-requests — worker unable-to-attend / request reassignment
   *
   * Sprint 10 contract: scope = own/team (worker cannot pick a replacement).
   * Fixed from operations/ where scope defaulted to 'all'.
   */
  @Permission('tasks.request_action', 'own')
  @Post('tasks/:id/action-requests')
  actionRequest(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TaskActionRequestDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/tasks/${id}/action-requests`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () =>
        this.attachments.appendActionRequest(id, body),
      )
      .then((r) => r.response);
  }

  /** GET /tasks/:id/attachments — list attachments */
  @Permission('tasks.view')
  @Get('tasks/:id/attachments')
  listAttachments(@Param('id') id: string) {
    return this.attachments.listAttachments(id);
  }
}
