import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';

type Row = Record<string, unknown>;

@Injectable()
export class WorkflowGovernanceRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Publish: validate → lock draft → materialize snapshot → insert version →
   * update draft pointer → emit outbox event. All in one transaction.
   */
  async publish(
    workflowId: string,
    revision: number,
    notes: string,
  ): Promise<Row> {
    return this.db.transaction(async (client) => {
      const tenantRow = await client.query<{ tenant_id: string }>(
        "SELECT current_setting('app.tenant_id', true)::uuid AS tenant_id",
      );
      const tenantId = tenantRow.rows[0].tenant_id;

      const draft = await client.query<Row>(
        'SELECT * FROM workflow_drafts WHERE tenant_id = $1::uuid AND id = $2::uuid AND revision = $3 AND archived_at IS NULL FOR UPDATE',
        [tenantId, workflowId, revision],
      );
      if (!draft.rows[0]) throw new Error('STALE_WORKFLOW_REVISION');

      // Validate name before committing
      if (!draft.rows[0].name) throw new Error('WORKFLOW_INVALID');

      const snapshot = {
        ...(draft.rows[0].schema as Record<string, unknown>),
        registryVersion: 1,
        notes,
      };

      // $3 and $4 carry the same JSON text but are bound as two separate
      // parameters (not the same placeholder reused) — Postgres unifies a
      // single positional parameter to one inferred type across all of its
      // occurrences, so casting the same $n to both ::bytea and ::jsonb in
      // one statement fails with "cannot cast type bytea to jsonb".
      const snapshotJson = JSON.stringify(snapshot);
      const version = await client.query<Row>(
        `INSERT INTO workflow_versions
           (tenant_id, workflow_id, version, content_hash, snapshot)
         SELECT tenant_id, id,
                COALESCE((SELECT max(version) + 1 FROM workflow_versions WHERE workflow_id = $1::uuid AND tenant_id = $2::uuid), 1),
                encode(sha256($3::bytea), 'hex'),
                $4::jsonb
         FROM workflow_drafts WHERE id = $1::uuid AND tenant_id = $2::uuid
         RETURNING id::text AS id, version, content_hash AS hash, snapshot, published_at AS "publishedAt"`,
        [workflowId, tenantId, snapshotJson, snapshotJson],
      );

      await client.query(
        `UPDATE workflow_drafts
         SET status = 'PUBLISHED', current_version_id = $1::uuid, revision = revision + 1, updated_at = clock_timestamp()
         WHERE tenant_id = $2::uuid AND id = $3::uuid`,
        [version.rows[0].id, tenantId, workflowId],
      );

      await client.query(
        `INSERT INTO outbox_events (id, event_id, event_type, event_version, tenant_id, payload, status)
         VALUES ($1::uuid, $2::uuid, 'workflow.published.v1', 1, $3::uuid, $4::jsonb, 'PENDING')`,
        [
          randomUUID(),
          randomUUID(),
          tenantId,
          JSON.stringify({
            workflowId,
            versionId: version.rows[0].id,
            version: version.rows[0].version,
          }),
        ],
      );

      return version.rows[0];
    });
  }

  async versions(workflowId: string): Promise<Row[]> {
    return this.db.tenantQuery<Row>(
      `SELECT id::text AS id, version, content_hash AS hash, snapshot,
              published_at AS "publishedAt"
       FROM workflow_versions WHERE workflow_id = $1::uuid ORDER BY version DESC`,
      [workflowId],
    );
  }

  async getVersion(versionId: string): Promise<Row> {
    // workflow_versions has no separate created_at column — published_at
    // (set once, at insert time, since versions are immutable) is the only
    // and correct creation timestamp.
    const rows = await this.db.tenantQuery<Row>(
      `SELECT id::text AS id, workflow_id::text AS "workflowId", version, content_hash AS hash,
              snapshot, published_at AS "publishedAt"
       FROM workflow_versions WHERE id = $1::uuid`,
      [versionId],
    );
    if (!rows[0]) throw new NotFoundException('WORKFLOW_VERSION_NOT_FOUND');
    return rows[0];
  }

  async archive(workflowId: string, revision: number): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET status = 'ARCHIVED', archived_at = clock_timestamp(), revision = revision + 1
       WHERE id = $1::uuid AND revision = $2 AND archived_at IS NULL
       RETURNING id::text AS id, status, revision`,
      [workflowId, revision],
    );
    if (!rows[0]) throw new Error('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  /** Platform template catalogue. `workflow_templates` is platform-owned
   * (no tenant_id ownership, no RLS) — reads use the plain, context-free
   * `query()`, not `tenantQuery()`, since platform-admin authoring calls
   * have no tenant context to set. `field_count` doesn't exist as a real
   * column, so the count is derived from the stored schema instead of a
   * denormalized counter that could drift. */
  async templates(): Promise<Row[]> {
    return this.db.query<Row>(
      `SELECT id::text AS id, name, description, category, industry, status,
              jsonb_array_length(COALESCE(schema->'fields', '[]'::jsonb)) AS "fieldCount"
       FROM workflow_templates WHERE archived_at IS NULL ORDER BY name`,
    );
  }

  async createTemplate(payload: {
    name: string;
    description?: string;
    category?: string;
    industry?: string;
  }): Promise<Row> {
    const rows = await this.db.query<Row>(
      `INSERT INTO workflow_templates (name, description, category, industry, schema, status)
       VALUES ($1, $2, $3, $4, '{"sections":[],"fields":[],"rules":[]}'::jsonb, 'PUBLISHED')
       RETURNING id::text AS id, name, description, category, industry, status, revision`,
      [
        payload.name,
        payload.description ?? '',
        payload.category ?? null,
        payload.industry ?? null,
      ],
    );
    return rows[0];
  }

  async updateTemplate(
    templateId: string,
    payload: {
      name?: string;
      description?: string;
      category?: string;
      industry?: string;
      schema?: Record<string, unknown>;
      archived?: boolean;
    },
    expectedRevision: number,
  ): Promise<Row> {
    const sets: string[] = [
      'revision = revision + 1',
      'updated_at = clock_timestamp()',
    ];
    const values: unknown[] = [];
    if (payload.name !== undefined) {
      values.push(payload.name);
      sets.push(`name = $${values.length}`);
    }
    if (payload.description !== undefined) {
      values.push(payload.description);
      sets.push(`description = $${values.length}`);
    }
    if (payload.category !== undefined) {
      values.push(payload.category);
      sets.push(`category = $${values.length}`);
    }
    if (payload.industry !== undefined) {
      values.push(payload.industry);
      sets.push(`industry = $${values.length}`);
    }
    if (payload.schema !== undefined) {
      values.push(JSON.stringify(payload.schema));
      sets.push(`schema = $${values.length}::jsonb`);
    }
    if (payload.archived) {
      sets.push('archived_at = clock_timestamp()');
    }
    values.push(templateId, expectedRevision);
    const rows = await this.db.query<Row>(
      `UPDATE workflow_templates SET ${sets.join(', ')}
       WHERE id = $${values.length - 1}::uuid AND revision = $${values.length} AND archived_at IS NULL
       RETURNING id::text AS id, name, description, category, industry, status, revision`,
      values,
    );
    if (!rows[0]) {
      const existing = await this.db.query<Row>(
        'SELECT 1 FROM workflow_templates WHERE id = $1::uuid AND archived_at IS NULL',
        [templateId],
      );
      if (!existing[0]) throw new NotFoundException('TEMPLATE_NOT_FOUND');
      throw new Error('STALE_TEMPLATE_REVISION');
    }
    return rows[0];
  }

  async instantiateTemplate(templateId: string): Promise<Row> {
    const rows = await this.db.query<Row>(
      `SELECT name, description, schema FROM workflow_templates WHERE id = $1::uuid AND archived_at IS NULL`,
      [templateId],
    );
    if (!rows[0]) throw new NotFoundException('TEMPLATE_NOT_FOUND');
    // Create a new, independent tenant-owned draft — never a live link back
    // to the template, matching the "no future linkage" contract.
    const result = await this.db.tenantQuery<Row>(
      `INSERT INTO workflow_drafts (tenant_id, name, description, schema)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1, $2, $3::jsonb)
       RETURNING id::text AS id, name, description, status, revision,
                 created_at AS "createdAt"`,
      [
        rows[0].name,
        rows[0].description ?? '',
        JSON.stringify(rows[0].schema ?? {}),
      ],
    );
    return result[0];
  }
}
