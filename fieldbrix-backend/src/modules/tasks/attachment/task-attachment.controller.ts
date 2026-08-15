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
import { DatabaseService } from '../../database/database/database.service';
import { NotFoundException } from '@nestjs/common';
import { TaskAttachmentDto, TaskActionRequestDto } from '../task/task.dto';

type Row = Record<string, unknown>;

@Controller()
@UseGuards(PermissionGuard)
export class TaskAttachmentController {
  constructor(
    private readonly db: DatabaseService,
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
      .getOrCreateAsync(key, fp, () => this.createAttachment(id, body))
      .then((r) => r.response);
  }

  private async createAttachment(
    taskId: string,
    payload: TaskAttachmentDto,
  ): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `INSERT INTO task_attachments (tenant_id, task_id, upload_id, category, created_by)
       SELECT tenant_id, id, $2::uuid, $3, NULLIF(current_setting('app.actor_id', true), '')::uuid
       FROM tasks WHERE id = $1::uuid
       RETURNING id::text AS id, task_id::text AS "taskId",
                 upload_id::text AS "uploadId", category,
                 created_at AS "createdAt"`,
      [taskId, payload.uploadId, payload.category ?? null],
    );
    if (!rows[0]) throw new NotFoundException('TASK_NOT_FOUND');
    return rows[0];
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
      .getOrCreateAsync(key, fp, () => this.appendActionRequest(id, body))
      .then((r) => r.response);
  }

  private async appendActionRequest(
    taskId: string,
    payload: TaskActionRequestDto,
  ): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `INSERT INTO task_history (tenant_id, task_id, event_type, after_state, reason)
       SELECT tenant_id, id, 'ACTION_REQUESTED', $2::jsonb, $3
       FROM tasks WHERE id = $1::uuid
       RETURNING id::text AS id, event_type AS event, occurred_at AS "occurredAt"`,
      [taskId, JSON.stringify(payload), payload.reason ?? null],
    );
    if (!rows[0]) throw new NotFoundException('TASK_NOT_FOUND');
    return rows[0];
  }

  /** GET /tasks/:id/attachments — list attachments */
  @Permission('tasks.view')
  @Get('tasks/:id/attachments')
  listAttachments(@Param('id') id: string) {
    return this.db.tenantQuery<Row>(
      `SELECT id::text AS id, task_id::text AS "taskId",
              upload_id::text AS "uploadId", category,
              created_at AS "createdAt"
       FROM task_attachments WHERE task_id = $1::uuid
       ORDER BY created_at DESC`,
      [id],
    );
  }
}
