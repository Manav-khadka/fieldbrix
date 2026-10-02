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
      supervisorIds?: string[];
      verificationMode?: 'AUTO' | 'MANUAL_SUPERVISOR' | 'QUALITY_DEPARTMENT';
      requiredApprovals?: number;
      qualityTeamId?: string;
    },
    assignedBy?: string,
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
        const workflowAccess = await client.query(
          `SELECT 1 FROM tasks t JOIN workflow_versions wv ON wv.id = t.workflow_version_id
           WHERE t.id = $1::uuid AND (
             NOT EXISTS (SELECT 1 FROM user_workflow_access uwa WHERE uwa.tenant_id = $2::uuid AND uwa.user_id = $3::uuid)
             OR EXISTS (SELECT 1 FROM user_workflow_access uwa WHERE uwa.tenant_id = $2::uuid AND uwa.user_id = $3::uuid
               AND uwa.workflow_id = wv.workflow_id AND uwa.access_level = 'PERFORM'))`,
          [taskId, tenantId, payload.workerId],
        );
        if (!workflowAccess.rows[0])
          throw new BadRequestException('WORKER_WORKFLOW_ACCESS_REQUIRED');
      }

      if (payload.teamId) {
        const team = await client.query(
          'SELECT 1 FROM teams WHERE id = $1::uuid AND tenant_id = $2::uuid AND active = true',
          [payload.teamId, tenantId],
        );
        if (!team.rows[0])
          throw new BadRequestException('ACTIVE_TEAM_REQUIRED');
      }

      if (payload.qualityTeamId) {
        const qualityTeam = await client.query(
          'SELECT 1 FROM teams WHERE id = $1::uuid AND tenant_id = $2::uuid AND active = true',
          [payload.qualityTeamId, tenantId],
        );
        if (!qualityTeam.rows[0])
          throw new BadRequestException('ACTIVE_QUALITY_TEAM_REQUIRED');
      }

      if (payload.workerId && payload.teamId) {
        const membership = await client.query(
          'SELECT 1 FROM team_memberships WHERE tenant_id = $1::uuid AND team_id = $2::uuid AND user_id = $3::uuid AND ends_at IS NULL',
          [tenantId, payload.teamId, payload.workerId],
        );
        if (!membership.rows[0])
          throw new BadRequestException('WORKER_TEAM_MEMBERSHIP_REQUIRED');
      }

      const supervisorIds = [...new Set(payload.supervisorIds ?? [])];
      if (
        payload.verificationMode !== 'AUTO' &&
        !supervisorIds.length &&
        !payload.qualityTeamId
      )
        throw new BadRequestException('VERIFICATION_OWNER_REQUIRED');
      if (supervisorIds.length) {
        const supervisors = await client.query<{ id: string }>(
          `SELECT id::text FROM users WHERE tenant_id = $1::uuid AND active AND id = ANY($2::uuid[])`,
          [tenantId, supervisorIds],
        );
        if (supervisors.rowCount !== supervisorIds.length)
          throw new BadRequestException('ACTIVE_SUPERVISORS_REQUIRED');
      }

      // Close current active assignment
      await client.query(
        'UPDATE task_assignments SET ended_at = clock_timestamp() WHERE task_id = $1::uuid AND ended_at IS NULL',
        [taskId],
      );

      const result = await client.query<Row>(
        `INSERT INTO task_assignments (tenant_id, task_id, worker_id, team_id, lead, reason, assigned_by)
         SELECT tenant_id, id, $2::uuid, $3::uuid, $4, $5, $6::uuid
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
          assignedBy ?? null,
        ],
      );
      const assignment = result.rows[0];

      await client.query(
        'DELETE FROM task_supervisors WHERE tenant_id = $1::uuid AND task_id = $2::uuid',
        [tenantId, taskId],
      );
      for (const supervisorId of supervisorIds)
        await client.query(
          `INSERT INTO task_supervisors (tenant_id, task_id, user_id, supervisor_kind)
           VALUES ($1::uuid, $2::uuid, $3::uuid, 'OPERATIONAL')`,
          [tenantId, taskId, supervisorId],
        );
      const verificationMode = payload.verificationMode ?? 'MANUAL_SUPERVISOR';
      await client.query(
        `INSERT INTO task_verification_requirements (tenant_id, task_id, verification_mode, required_approvals, quality_team_id)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid)
         ON CONFLICT (tenant_id, task_id) DO UPDATE SET verification_mode = EXCLUDED.verification_mode,
           required_approvals = EXCLUDED.required_approvals, quality_team_id = EXCLUDED.quality_team_id`,
        [
          tenantId,
          taskId,
          verificationMode,
          payload.requiredApprovals ?? 1,
          payload.qualityTeamId ?? null,
        ],
      );

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
            supervisorIds,
            verificationMode,
            assignedBy: assignedBy ?? null,
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
      supervisorIds?: string[];
      verificationMode?: 'AUTO' | 'MANUAL_SUPERVISOR' | 'QUALITY_DEPARTMENT';
      requiredApprovals?: number;
      qualityTeamId?: string;
    },
    assignedBy?: string,
  ) {
    return this.assign(taskId, payload, assignedBy);
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
              lead, reason, assigned_by::text AS "assignedBy", started_at AS "startedAt",
              COALESCE((SELECT jsonb_agg(ts.user_id::text) FROM task_supervisors ts
                WHERE ts.task_id = task_assignments.task_id AND ts.tenant_id = task_assignments.tenant_id), '[]'::jsonb) AS "supervisorIds",
              tvr.verification_mode AS "verificationMode", tvr.required_approvals AS "requiredApprovals",
              tvr.quality_team_id::text AS "qualityTeamId"
       FROM task_assignments LEFT JOIN task_verification_requirements tvr
         ON tvr.tenant_id = task_assignments.tenant_id AND tvr.task_id = task_assignments.task_id
       WHERE task_assignments.task_id = $1::uuid AND ended_at IS NULL`,
      [taskId],
    );
    return rows[0] ?? null;
  }
}
