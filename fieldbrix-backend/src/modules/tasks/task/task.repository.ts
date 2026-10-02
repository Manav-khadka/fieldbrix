import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  work_type AS "workType",
  signature_policy AS "signaturePolicy",
  external_reference_id AS "externalReferenceId",
  contact_phone AS "contactPhone",
  COALESCE(latitude, (
    SELECT NULLIF(site.gps->>'lat', '')::double precision
    FROM master_sites site WHERE site.id = tasks.site_id
  )) AS latitude,
  COALESCE(longitude, (
    SELECT NULLIF(site.gps->>'lng', '')::double precision
    FROM master_sites site WHERE site.id = tasks.site_id
  )) AS longitude,
  CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'TASK' ELSE 'LOCATION' END AS "coordinateSource",
  (SELECT customer.name FROM master_customers customer WHERE customer.id = tasks.customer_id) AS "customerName",
  (SELECT site.name FROM master_sites site WHERE site.id = tasks.site_id) AS "siteName",
  custom_fields AS "customFields",
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

  async list(
    query: ListTasksQueryDto,
    searchableCustomFields?: string[],
  ): Promise<{ items: Row[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const where: string[] = [
      `tenant_id = current_setting('app.tenant_id', true)::uuid`,
      'archived_at IS NULL',
    ];

    if (query.search) {
      values.push(`%${query.search.toLowerCase()}%`);
      const searchParameter = values.length;
      let customSearch = `lower(custom_fields::text) LIKE $${searchParameter}`;
      if (searchableCustomFields) {
        if (searchableCustomFields.length === 0) customSearch = 'false';
        else {
          values.push(searchableCustomFields);
          customSearch = `EXISTS (
            SELECT 1 FROM jsonb_each_text(custom_fields) field
            WHERE field.key = ANY($${values.length}::text[])
              AND lower(field.value) LIKE $${searchParameter}
          )`;
        }
      }
      where.push(
        `(lower(task_number) LIKE $${searchParameter} OR lower(description) LIKE $${searchParameter} OR lower(COALESCE(external_reference_id, '')) LIKE $${searchParameter} OR lower(COALESCE(contact_phone, '')) LIKE $${searchParameter} OR ${customSearch})`,
      );
    }
    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }
    if (query.priority) {
      values.push(query.priority);
      where.push(`priority = $${values.length}`);
    }
    if (query.customerId) {
      values.push(query.customerId);
      where.push(`customer_id = $${values.length}::uuid`);
    }
    if (query.workflowId) {
      values.push(query.workflowId);
      where.push(
        `EXISTS (
          SELECT 1 FROM workflow_versions version
          WHERE version.id = tasks.workflow_version_id
            AND version.workflow_id = $${values.length}::uuid
        )`,
      );
    }
    if (query.siteId) {
      values.push(query.siteId);
      where.push(`site_id = $${values.length}::uuid`);
    }
    if (query.assignedTo) {
      values.push(query.assignedTo);
      where.push(
        `EXISTS (
          SELECT 1 FROM task_assignments assignment
          WHERE assignment.task_id = tasks.id
            AND assignment.worker_id = $${values.length}::uuid
            AND assignment.ended_at IS NULL
        )`,
      );
    }
    if (query.customField && query.customValue !== undefined) {
      values.push(query.customField);
      const fieldParameter = values.length;
      values.push(
        query.customOperator === 'equals'
          ? query.customValue.toLowerCase()
          : `%${query.customValue.toLowerCase()}%`,
      );
      const valueParameter = values.length;
      where.push(
        query.customOperator === 'equals'
          ? `lower(COALESCE(custom_fields ->> $${fieldParameter}, '')) = $${valueParameter}`
          : `lower(COALESCE(custom_fields ->> $${fieldParameter}, '')) LIKE $${valueParameter}`,
      );
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

    return {
      items: rows,
      total: Number(countRows[0]?.count ?? 0),
      page,
      limit,
    };
  }

  async map(query: ListTasksQueryDto): Promise<Row[]> {
    const values: unknown[] = [];
    const where = [
      `tenant_id = current_setting('app.tenant_id', true)::uuid`,
      'archived_at IS NULL',
      `COALESCE(latitude, (SELECT NULLIF(site.gps->>'lat', '')::double precision FROM master_sites site WHERE site.id = tasks.site_id)) IS NOT NULL`,
      `COALESCE(longitude, (SELECT NULLIF(site.gps->>'lng', '')::double precision FROM master_sites site WHERE site.id = tasks.site_id)) IS NOT NULL`,
    ];
    const add = (column: string, value?: string, uuid = false) => {
      if (!value) return;
      values.push(value);
      where.push(`${column} = $${values.length}${uuid ? '::uuid' : ''}`);
    };
    add('status', query.status);
    add('priority', query.priority);
    add('customer_id', query.customerId, true);
    if (query.workflowId) {
      values.push(query.workflowId);
      where.push(`EXISTS (
        SELECT 1 FROM workflow_versions version
        WHERE version.id = tasks.workflow_version_id
          AND version.workflow_id = $${values.length}::uuid
      )`);
    }
    if (query.search) {
      values.push(`%${query.search.trim().toLowerCase()}%`);
      where.push(`(
        lower(task_number) LIKE $${values.length}
        OR lower(description) LIKE $${values.length}
        OR lower(COALESCE(external_reference_id, '')) LIKE $${values.length}
      )`);
    }
    return this.db.tenantQuery<Row>(
      `SELECT ${TASK_SELECT}
       FROM tasks
       WHERE ${where.join(' AND ')}
       ORDER BY updated_at DESC
       LIMIT 5000`,
      values,
    );
  }

  async findById(id: string): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `SELECT ${TASK_SELECT} FROM tasks WHERE tenant_id = current_setting('app.tenant_id', true)::uuid AND id = $1::uuid AND archived_at IS NULL`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('TASK_NOT_FOUND');
    return rows[0];
  }

  async findByExternalReference(
    externalReferenceId: string,
    customerId: string,
  ): Promise<Row | null> {
    const rows = await this.db.tenantQuery<Row>(
      `SELECT ${TASK_SELECT} FROM tasks
       WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
         AND external_reference_id = $1 AND customer_id = $2::uuid
         AND archived_at IS NULL`,
      [externalReferenceId, customerId],
    );
    return rows[0] ?? null;
  }

  /**
   * Task IDs with a dead-lettered outbox event in the last 24h — the
   * SYNC_PENDING signal. Task-related outbox events (`task.created.v1`,
   * `task.assigned.v1`, `task.transitioned.v1`, ...) all carry `taskId` in
   * their payload, so this is a single query rather than one per task.
   */
  async findDeadLetteredTaskIds(): Promise<Set<string>> {
    const rows = await this.db.tenantQuery<{ taskId: string }>(
      `SELECT DISTINCT payload->>'taskId' AS "taskId" FROM outbox_events
       WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
         AND status = 'DEAD_LETTERED' AND payload ? 'taskId'
         AND created_at > now() - interval '24 hours'`,
    );
    return new Set(rows.map((r) => r.taskId).filter(Boolean));
  }

  async create(payload: Row): Promise<Row> {
    return this.db.transaction(async (client) => {
      const tenant = await client.query<{ id: string }>(
        "SELECT current_setting('app.tenant_id', true)::uuid AS id",
      );
      const tenantId = tenant.rows[0].id;

      // Validate workflow version belongs to tenant and its source workflow
      // is not archived — archiving must block new assignment while still
      // preserving pinned rendering for tasks created before the archive.
      const version = await client.query<{ id: string; draftStatus: string }>(
        `SELECT v.id, d.status AS "draftStatus"
         FROM workflow_versions v
         JOIN workflow_drafts d ON d.id = v.workflow_id AND d.tenant_id = v.tenant_id
         WHERE v.tenant_id = $1::uuid AND v.id = $2::uuid`,
        [tenantId, payload.workflowVersionId],
      );
      if (!version.rows[0]) throw new Error('PUBLISHED_WORKFLOW_REQUIRED');
      if (version.rows[0].draftStatus === 'ARCHIVED')
        throw new Error('WORKFLOW_ARCHIVED');

      const numRow = await client.query<{ task_number: string }>(
        "SELECT 'FBX-' || lpad(nextval('task_number_sequence')::text, 7, '0') AS task_number",
      );
      const taskNumber = numRow.rows[0].task_number;

      const result = await client.query<Row>(
        `INSERT INTO tasks
           (tenant_id, task_number, workflow_version_id, customer_id, site_id, target_id,
            description, instructions, scheduled_at, due_at, estimated_minutes, priority,
            work_type, signature_policy, external_reference_id, contact_phone,
            latitude, longitude, custom_fields)
         VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7, $8,
                 $9::timestamptz, $10::timestamptz, $11, $12, $13, $14::jsonb,
                 $15, $16, $17, $18, $19::jsonb)
         RETURNING ${TASK_SELECT}`,
        [
          tenantId,
          taskNumber,
          payload.workflowVersionId,
          payload.customerId ?? null,
          payload.siteId ?? null,
          payload.targetId ?? null,
          payload.description ?? '',
          payload.instructions ?? '',
          payload.scheduledAt ?? null,
          payload.dueAt ?? null,
          payload.estimatedMinutes ?? null,
          payload.priority ?? 'NORMAL',
          payload.workType ?? null,
          payload.signaturePolicy
            ? JSON.stringify(payload.signaturePolicy)
            : null,
          payload.externalReferenceId ?? null,
          payload.contactPhone ?? null,
          payload.latitude ?? null,
          payload.longitude ?? null,
          JSON.stringify(payload.customFields ?? {}),
        ],
      );
      const task = result.rows[0];

      await client.query(
        `INSERT INTO task_history (tenant_id, task_id, event_type, after_state)
         VALUES ($1::uuid, $2::uuid, 'TASK_CREATED', $3::jsonb)`,
        [
          tenantId,
          task.id,
          JSON.stringify({ status: 'DRAFT', number: task.number }),
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (id, event_id, event_type, event_version, tenant_id, payload, status)
         VALUES ($1::uuid, $2::uuid, 'task.created.v1', 1, $3::uuid, $4::jsonb, 'PENDING')`,
        [
          randomUUID(),
          randomUUID(),
          tenantId,
          JSON.stringify({ taskId: task.id, taskNumber: task.number }),
        ],
      );

      return task;
    });
  }

  async update(id: string, payload: Row, revision: number): Promise<Row> {
    const sets: string[] = [
      'revision = revision + 1',
      'updated_at = clock_timestamp()',
    ];
    const values: unknown[] = [];
    const map: Record<string, string> = {
      description: 'description',
      instructions: 'instructions',
      scheduledAt: 'scheduled_at',
      dueAt: 'due_at',
      priority: 'priority',
      contactPhone: 'contact_phone',
      latitude: 'latitude',
      longitude: 'longitude',
    };
    for (const [key, col] of Object.entries(map)) {
      if (payload[key] !== undefined) {
        values.push(payload[key]);
        sets.push(`${col} = $${values.length}`);
      }
    }
    if (payload.customFields !== undefined) {
      values.push(JSON.stringify(payload.customFields));
      sets.push(`custom_fields = $${values.length}::jsonb`);
    }
    values.push(id, revision);
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE tasks SET ${sets.join(', ')}
       WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
         AND id = $${values.length - 1}::uuid AND revision = $${values.length} AND archived_at IS NULL
       RETURNING ${TASK_SELECT}`,
      values,
    );
    if (!rows[0]) {
      const existing = await this.db.tenantQuery(
        `SELECT 1 FROM tasks WHERE tenant_id = current_setting('app.tenant_id', true)::uuid AND id = $1::uuid AND archived_at IS NULL`,
        [id],
      );
      if (!existing[0]) throw new NotFoundException('TASK_NOT_FOUND');
      throw new ConflictException('STALE_TASK_REVISION');
    }
    return rows[0];
  }
}
