import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import type { TaskActionRequestDto, TaskAttachmentDto } from '../task/task.dto';

type Row = Record<string, unknown>;

@Injectable()
export class TaskAttachmentService {
  constructor(private readonly db: DatabaseService) {}

  async createAttachment(
    taskId: string,
    payload: TaskAttachmentDto,
  ): Promise<Row> {
    try {
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
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async appendActionRequest(
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

  listAttachments(taskId: string): Promise<Row[]> {
    return this.db.tenantQuery<Row>(
      `SELECT id::text AS id, task_id::text AS "taskId",
              upload_id::text AS "uploadId", category,
              created_at AS "createdAt"
       FROM task_attachments WHERE task_id = $1::uuid
       ORDER BY created_at DESC`,
      [taskId],
    );
  }

  private mapWriteError(error: unknown): Error {
    if (error instanceof NotFoundException) return error;
    const code = (error as { code?: string } | undefined)?.code;
    if (code === '23503') return new BadRequestException('UPLOAD_NOT_FOUND');
    return error as Error;
  }
}
