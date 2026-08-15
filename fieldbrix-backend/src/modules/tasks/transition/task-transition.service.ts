import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';
import {
  TRANSITION_MAP,
  isAllowedTransition,
  isTaskStatus,
  type TaskStatus,
} from './transition-map';

type Row = Record<string, unknown>;

@Injectable()
export class TaskTransitionService {
  constructor(private readonly db: DatabaseService) {}

  async transition(taskId: string, targetStatus: string, reason?: string, revision?: number): Promise<Row> {
    if (!isTaskStatus(targetStatus))
      throw new ConflictException(`UNKNOWN_TASK_STATUS: ${targetStatus}`);

    return this.db.transaction(async (client) => {
      const current = await client.query<{ status: string; revision: number; tenant_id: string }>(
        'SELECT status, revision, tenant_id FROM tasks WHERE id = $1::uuid AND archived_at IS NULL FOR UPDATE',
        [taskId],
      );
      if (!current.rows[0]) throw new NotFoundException('TASK_NOT_FOUND');

      const { status, revision: currentRevision, tenant_id } = current.rows[0];

      if (revision !== undefined && revision !== currentRevision)
        throw new ConflictException('STALE_TASK_REVISION');

      const fromStatus = status as TaskStatus;
      if (!isAllowedTransition(fromStatus, targetStatus as TaskStatus))
        throw new ConflictException(
          `INVALID_TASK_TRANSITION: ${status} → ${targetStatus}. Allowed: [${(TRANSITION_MAP[fromStatus] as string[]).join(', ')}]`,
        );

      const updated = await client.query<Row>(
        `UPDATE tasks SET status = $1, revision = revision + 1, updated_at = clock_timestamp()
         WHERE id = $2::uuid
         RETURNING id::text AS id, task_number AS number, status, revision`,
        [targetStatus, taskId],
      );

      await client.query(
        `INSERT INTO task_history (tenant_id, task_id, event_type, before_state, after_state, reason)
         VALUES ($1::uuid, $2::uuid, 'TASK_TRANSITIONED', $3::jsonb, $4::jsonb, $5)`,
        [tenant_id, taskId, JSON.stringify({ status }), JSON.stringify({ status: targetStatus }), reason ?? null],
      );

      await client.query(
        `INSERT INTO outbox_events (id, event_id, event_type, event_version, tenant_id, payload, status)
         VALUES ($1::uuid, $2::uuid, 'task.transitioned.v1', 1, $3::uuid, $4::jsonb, 'PENDING')`,
        [randomUUID(), randomUUID(), tenant_id, JSON.stringify({ taskId, from: status, to: targetStatus })],
      );

      return updated.rows[0];
    });
  }

  cancel(taskId: string, reason?: string, revision?: number) {
    return this.transition(taskId, 'CANCELLED', reason, revision);
  }

  reopen(taskId: string, reason?: string, revision?: number) {
    return this.transition(taskId, 'REOPENED', reason, revision);
  }
}
