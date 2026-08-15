import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';
import type { ListTasksQueryDto } from './task.dto';

type Row = Record<string, unknown>;

const TASK_SELECT = `
  id::text AS id,
  task_number AS number,
  status,
  flags,
  priority,
  description,
  instructions,
  scheduled_at AS "scheduledAt",
  due_at AS "dueAt",
  estimated_minutes AS "estimatedMinutes",
  revision,
  workflow_version_id::text AS "workflowVersionId",
  customer_id::text AS "customerId",
  site_id::text AS "siteId",
  target_id::text AS "targetId",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

@Injectable()
export class TaskRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(query: ListTasksQueryDto): Promise<{ items: Row[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const where: string[] = ['archived_at IS NULL'];

    if (query.search) {
      values.push(`%${query.search.toLowerCase()}%`);
      where.push(`(lower(task_number) LIKE $${values.length} OR lower(description) LIKE $${values.length})`);
    }
    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }
    if (query.customerId) {
      values.push(query.customerId);
      where.push(`customer_id = $${values.length}::uuid`);
    }
    if (query.siteId) {
      values.push(query.siteId);
      where.push(`site_id = $${values.length}::uuid`);
    }

    const whereClause = where.join(' AND ');
    const [rows, countRows] = await Promise.all([
      this.db.tenantQuery<Row>(
        `SELECT ${TASK_SELECT}
         FROM tasks WHERE ${whereClause}
         ORDER BY scheduled_at NULLS LAST, created_at DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset],
      ),
      this.db.tenantQuery<{ count: string }>(
        `SELECT count(*)::text AS count FROM tasks WHERE ${whereClause}`,
        values,
      ),
    ]);

    return { items: rows, total: Number(countRows[0]?.count ?? 0), page, limit };
  }

  async findById(id: string): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `SELECT ${TASK_SELECT} FROM tasks WHERE id = $1::uuid AND archived_at IS NULL`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('TASK_NOT_FOUND');
    return rows[0];
  }

  async create(payload: Row): Promise<Row> {
    return this.db.transaction(async (client) => {
      const tenant = await client.query<{ id: string }>(
        "SELECT current_setting('app.tenant_id', true)::uuid AS id",
      );
      const tenantId = tenant.rows[0].id;

      // Validate workflow version belongs to tenant
      const version = await client.query<{ id: string }>(
        'SELECT id FROM workflow_versions WHERE tenant_id = $1::uuid AND id = $2::uuid',
        [tenantId, payload.workflowVersionId],
      );
      if (!version.rows[0]) throw new Error('PUBLISHED_WORKFLOW_REQUIRED');

      const numRow = await client.query<{ task_number: string }>(
        "SELECT 'FBX-' || lpad(nextval('task_number_sequence')::text, 7, '0') AS task_number",
      );
      const taskNumber = numRow.rows[0].task_number;

      const result = await client.query<Row>(
        `INSERT INTO tasks
           (tenant_id, task_number, workflow_version_id, customer_id, site_id, target_id,
            description, instructions, scheduled_at, due_at, estimated_minutes, priority)
         VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7, $8,
                 $9::timestamptz, $10::timestamptz, $11, $12)
         RETURNING ${TASK_SELECT}`,
        [
          tenantId, taskNumber, payload.workflowVersionId,
          payload.customerId ?? null, payload.siteId ?? null, payload.targetId ?? null,
          payload.description ?? '', payload.instructions ?? '',
          payload.scheduledAt ?? null, payload.dueAt ?? null,
          payload.estimatedMinutes ?? null, payload.priority ?? 'NORMAL',
        ],
      );
      const task = result.rows[0];

      await client.query(
        `INSERT INTO task_history (tenant_id, task_id, event_type, after_state)
         VALUES ($1::uuid, $2::uuid, 'TASK_CREATED', $3::jsonb)`,
        [tenantId, task.id, JSON.stringify({ status: 'DRAFT', number: task.number })],
      );

      await client.query(
        `INSERT INTO outbox_events (id, event_id, event_type, event_version, tenant_id, payload, status)
         VALUES ($1::uuid, $2::uuid, 'task.created.v1', 1, $3::uuid, $4::jsonb, 'PENDING')`,
        [randomUUID(), randomUUID(), tenantId, JSON.stringify({ taskId: task.id, taskNumber: task.number })],
      );

      return task;
    });
  }

  async update(id: string, payload: Row, revision: number): Promise<Row> {
    const sets: string[] = ['revision = revision + 1', 'updated_at = clock_timestamp()'];
    const values: unknown[] = [];
    const allowed = ['description', 'instructions', 'scheduled_at', 'due_at', 'priority'];
    const map: Record<string, string> = {
      description: 'description', instructions: 'instructions',
      scheduledAt: 'scheduled_at', dueAt: 'due_at', priority: 'priority',
    };
    for (const [key, col] of Object.entries(map)) {
      if (payload[key] !== undefined) {
        values.push(payload[key]);
        sets.push(`${col} = $${values.length}`);
      }
    }
    void allowed; // suppress unused
    values.push(id, revision);
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE tasks SET ${sets.join(', ')}
       WHERE id = $${values.length - 1}::uuid AND revision = $${values.length} AND archived_at IS NULL
       RETURNING ${TASK_SELECT}`,
      values,
    );
    if (!rows[0]) {
      const existing = await this.db.tenantQuery('SELECT 1 FROM tasks WHERE id = $1::uuid AND archived_at IS NULL', [id]);
      if (!existing[0]) throw new NotFoundException('TASK_NOT_FOUND');
      throw new ConflictException('STALE_TASK_REVISION');
    }
    return rows[0];
  }
}
