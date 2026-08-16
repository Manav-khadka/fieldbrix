import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';

type Row = Record<string, unknown>;

@Injectable()
export class TaskAssignmentService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Assign a task to a worker and/or team.
   * Validates: task exists, worker is active, team is active,
   * worker belongs to team when both are provided.
   * Closes any current open assignment atomically.
   */
  async assign(
    taskId: string,
    payload: {
      workerId?: string;
      teamId?: string;
      lead?: boolean;
      reason?: string;
    },
  ): Promise<Row> {
    if (!payload.workerId && !payload.teamId)
      throw new BadRequestException('ASSIGNMENT_TARGET_REQUIRED');

    return this.db.transaction(async (client) => {
      const taskRow = await client.query<{ tenant_id: string }>(
        'SELECT tenant_id FROM tasks WHERE id = $1::uuid AND archived_at IS NULL FOR UPDATE',
        [taskId],
      );
      if (!taskRow.rows[0]) throw new NotFoundException('TASK_NOT_FOUND');
      const tenantId = taskRow.rows[0].tenant_id;

      if (payload.workerId) {
        const worker = await client.query(
          'SELECT 1 FROM users WHERE id = $1::uuid AND tenant_id = $2::uuid AND active = true',
          [payload.workerId, tenantId],
        );
        if (!worker.rows[0])
          throw new BadRequestException('ACTIVE_WORKER_REQUIRED');
      }

      if (payload.teamId) {
        const team = await client.query(
          'SELECT 1 FROM teams WHERE id = $1::uuid AND tenant_id = $2::uuid AND active = true',
          [payload.teamId, tenantId],
        );
        if (!team.rows[0])
          throw new BadRequestException('ACTIVE_TEAM_REQUIRED');
      }

      if (payload.workerId && payload.teamId) {
        const membership = await client.query(
          'SELECT 1 FROM team_memberships WHERE tenant_id = $1::uuid AND team_id = $2::uuid AND user_id = $3::uuid AND ends_at IS NULL',
          [tenantId, payload.teamId, payload.workerId],
        );
        if (!membership.rows[0])
          throw new BadRequestException('WORKER_TEAM_MEMBERSHIP_REQUIRED');
      }

      // Close current active assignment
      await client.query(
        'UPDATE task_assignments SET ended_at = clock_timestamp() WHERE task_id = $1::uuid AND ended_at IS NULL',
        [taskId],
      );

      const result = await client.query<Row>(
        `INSERT INTO task_assignments (tenant_id, task_id, worker_id, team_id, lead, reason)
         SELECT tenant_id, id, $2::uuid, $3::uuid, $4, $5
         FROM tasks WHERE id = $1::uuid
         RETURNING id::text AS id, task_id::text AS "taskId",
                   worker_id::text AS "workerId", team_id::text AS "teamId",
                   lead, started_at AS "startedAt"`,
        [
          taskId,
          payload.workerId ?? null,
          payload.teamId ?? null,
          payload.lead ?? false,
          payload.reason ?? null,
        ],
      );
      const assignment = result.rows[0];

      // Every other task mutation (create, transition) leaves a task_history
      // row and an outbox event — assignment silently didn't, which meant
      // "who was assigned and when" was invisible in the audit timeline and
      // nothing downstream (e.g. a future notification consumer) could ever
      // react to it.
      await client.query(
        `INSERT INTO task_history (tenant_id, task_id, event_type, after_state, reason)
         VALUES ($1::uuid, $2::uuid, 'TASK_ASSIGNED', $3::jsonb, $4)`,
        [
          tenantId,
          taskId,
          JSON.stringify({
            workerId: payload.workerId ?? null,
            teamId: payload.teamId ?? null,
            lead: payload.lead ?? false,
          }),
          payload.reason ?? null,
        ],
      );
      await client.query(
        `INSERT INTO outbox_events (id, event_id, event_type, event_version, tenant_id, payload, status)
         VALUES ($1::uuid, $2::uuid, 'task.assigned.v1', 1, $3::uuid, $4::jsonb, 'PENDING')`,
        [
          randomUUID(),
          randomUUID(),
          tenantId,
          JSON.stringify({
            taskId,
            assignmentId: assignment.id,
            workerId: payload.workerId ?? null,
            teamId: payload.teamId ?? null,
          }),
        ],
      );

      return assignment;
    });
  }

  /** Reassign: identical to assign — the repository closes old and creates new */
  reassign(
    taskId: string,
    payload: {
      workerId?: string;
      teamId?: string;
      lead?: boolean;
      reason?: string;
    },
  ) {
    return this.assign(taskId, payload);
  }

  /**
   * The single open assignment for a task, or null if unassigned. `assign()`
   * always closes any prior open row before inserting the new one, so at
   * most one row with `ended_at IS NULL` can ever exist per task — this is
   * a lookup, not an aggregation.
   */
  async current(taskId: string): Promise<Row | null> {
    const rows = await this.db.tenantQuery<Row>(
      `SELECT id::text AS id, task_id::text AS "taskId",
              worker_id::text AS "workerId", team_id::text AS "teamId",
              lead, reason, started_at AS "startedAt"
       FROM task_assignments WHERE task_id = $1::uuid AND ended_at IS NULL`,
      [taskId],
    );
    return rows[0] ?? null;
  }
}
