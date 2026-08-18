import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { rowToCamelCase, toSnakeCase } from '../../master-data/support/case';

export type RecurrenceRecord = {
  id: string;
  name: string;
  frequency: string;
  cronExpression?: string;
  intervalCount: number;
  lookaheadDays: number;
  customerId: string;
  siteId: string;
  targetId?: string;
  workflowVersionId: string;
  defaultAssigneeId?: string;
  defaultTeamId?: string;
  lead: boolean;
  priority: string;
  instructions: string;
  active: boolean;
  startDate: string;
  endDate?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class RecurrenceRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<RecurrenceRecord[]> {
    const rows = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT r.*, r.id::text AS id, r.customer_id::text AS "customerId",
              r.site_id::text AS "siteId", r.target_id::text AS "targetId",
              r.workflow_version_id::text AS "workflowVersionId",
              r.default_assignee_id::text AS "defaultAssigneeId",
              r.default_team_id::text AS "defaultTeamId"
       FROM recurrence_plans r
       ORDER BY r.created_at DESC`,
    );
    return rows.map((r) => rowToCamelCase<RecurrenceRecord>(r));
  }

  async findById(id: string): Promise<RecurrenceRecord | undefined> {
    const rows = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT r.*, r.id::text AS id, r.customer_id::text AS "customerId",
              r.site_id::text AS "siteId", r.target_id::text AS "targetId",
              r.workflow_version_id::text AS "workflowVersionId",
              r.default_assignee_id::text AS "defaultAssigneeId",
              r.default_team_id::text AS "defaultTeamId"
       FROM recurrence_plans r
       WHERE r.id = $1::uuid`,
      [id],
    );
    return rows[0] ? rowToCamelCase<RecurrenceRecord>(rows[0]) : undefined;
  }

  async findOrFail(id: string): Promise<RecurrenceRecord> {
    const rec = await this.findById(id);
    if (!rec) throw new NotFoundException('RECURRENCE_PLAN_NOT_FOUND');
    return rec;
  }

  async create(payload: Record<string, unknown>): Promise<RecurrenceRecord> {
    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    const dbCols = keys.map(toSnakeCase);
    const values = keys.map((k) => payload[k]);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `INSERT INTO recurrence_plans (tenant_id, ${dbCols.join(', ')})
       VALUES (current_setting('app.tenant_id', true)::uuid, ${placeholders.join(', ')})
       RETURNING *, id::text AS id`,
      values,
    );
    return rowToCamelCase<RecurrenceRecord>(result[0]);
  }

  async update(
    id: string,
    payload: Record<string, unknown>,
    expectedRevision?: number,
  ): Promise<RecurrenceRecord> {
    const current = await this.findOrFail(id);
    if (
      expectedRevision !== undefined &&
      current.revision !== expectedRevision
    ) {
      throw new BadRequestException('STALE_REVISION');
    }

    const keys = Object.keys(payload).filter(
      (k) => payload[k] !== undefined && k !== 'revision',
    );
    if (keys.length === 0) return current;

    const values = keys.map((k) => payload[k]);
    const setClauses = keys.map((k, i) => `${toSnakeCase(k)} = $${i + 1}`);

    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `UPDATE recurrence_plans
       SET ${setClauses.join(', ')}, revision = revision + 1, updated_at = now()
       WHERE id = $${values.length + 1}::uuid
       RETURNING *, id::text AS id`,
      [...values, id],
    );
    return rowToCamelCase<RecurrenceRecord>(result[0]);
  }

  async recordException(
    recurrenceId: string,
    occurrenceDate: string,
    action: string,
    reason?: string,
    newTaskId?: string,
  ) {
    await this.database.tenantQuery(
      `INSERT INTO recurrence_exceptions (tenant_id, recurrence_id, occurrence_date, action, reason, new_task_id)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2::date, $3, $4, $5::uuid)
       ON CONFLICT (tenant_id, recurrence_id, occurrence_date)
       DO UPDATE SET action = EXCLUDED.action, reason = EXCLUDED.reason, new_task_id = EXCLUDED.new_task_id`,
      [recurrenceId, occurrenceDate, action, reason ?? null, newTaskId ?? null],
    );
  }
}
