import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';

type Row = Record<string, unknown>;

@Injectable()
export class WorkflowDraftRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(search?: string, status?: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const offset = (page - 1) * safeLimit;
    const values: unknown[] = [];
    const where: string[] = ['archived_at IS NULL'];

    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      where.push(
        `(lower(name) LIKE $${values.length} OR lower(description) LIKE $${values.length})`,
      );
    }
    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }

    const whereClause = where.join(' AND ');
    const [rows, countRows] = await Promise.all([
      this.db.tenantQuery<Row>(
        `SELECT id::text AS id, name, description, status, revision, industry, category,
                current_version_id::text AS "currentVersionId",
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM workflow_drafts WHERE ${whereClause}
         ORDER BY updated_at DESC, id ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, safeLimit, offset],
      ),
      this.db.tenantQuery<{ count: string }>(
        `SELECT count(*)::text AS count FROM workflow_drafts WHERE ${whereClause}`,
        values,
      ),
    ]);
    return {
      items: rows,
      total: Number(countRows[0]?.count ?? 0),
      page,
      limit: safeLimit,
    };
  }

  async findById(id: string): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `SELECT id::text AS id, name, description, status, revision, industry, category,
              schema, current_version_id::text AS "currentVersionId",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM workflow_drafts WHERE id = $1::uuid AND archived_at IS NULL`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('WORKFLOW_NOT_FOUND');
    return rows[0];
  }

  async create(payload: Row): Promise<Row> {
    const schema = JSON.stringify(
      payload.schema ?? { sections: [], fields: [], rules: [] },
    );
    const rows = await this.db.tenantQuery<Row>(
      `INSERT INTO workflow_drafts (tenant_id, name, description, industry, category, schema)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1, $2, $3, $4, $5::jsonb)
       RETURNING id::text AS id, name, description, status, revision, schema,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        payload.name,
        payload.description ?? '',
        payload.industry ?? null,
        payload.category ?? null,
        schema,
      ],
    );
    return rows[0];
  }

  async update(id: string, payload: Row, revision: number): Promise<Row> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    if (payload.name !== undefined) {
      values.push(payload.name);
      setClauses.push(`name = $${values.length}`);
    }
    if (payload.description !== undefined) {
      values.push(payload.description);
      setClauses.push(`description = $${values.length}`);
    }
    if (payload.industry !== undefined) {
      values.push(payload.industry);
      setClauses.push(`industry = $${values.length}`);
    }
    if (payload.category !== undefined) {
      values.push(payload.category);
      setClauses.push(`category = $${values.length}`);
    }
    setClauses.push(
      'revision = revision + 1',
      'updated_at = clock_timestamp()',
    );
    values.push(id, revision);
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts SET ${setClauses.join(', ')}
       WHERE id = $${values.length - 1}::uuid AND revision = $${values.length} AND archived_at IS NULL
       RETURNING id::text AS id, name, description, status, revision, updated_at AS "updatedAt"`,
      values,
    );
    if (!rows[0]) {
      const existing = await this.db.tenantQuery<Row>(
        'SELECT 1 FROM workflow_drafts WHERE id = $1::uuid AND archived_at IS NULL',
        [id],
      );
      if (!existing[0]) throw new NotFoundException('WORKFLOW_NOT_FOUND');
      throw new ConflictException('STALE_WORKFLOW_REVISION');
    }
    return rows[0];
  }

  async addToSchema(
    id: string,
    kind: 'sections' | 'fields',
    value: Row,
    revision: number,
  ): Promise<Row> {
    const entry = JSON.stringify([{ id: randomUUID(), ...value }]);
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET schema = jsonb_set(schema, '{${kind}}', COALESCE(schema->'${kind}', '[]'::jsonb) || $1::jsonb),
           revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $2::uuid AND revision = $3 AND archived_at IS NULL
       RETURNING id::text AS id, name, status, revision, schema`,
      [entry, id, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  async patchSchemaElement(
    workflowId: string,
    kind: 'sections' | 'fields',
    elementId: string,
    patch: Row,
    revision: number,
  ): Promise<Row> {
    // Build a jsonb patch: iterate over schema->kind, update matching element
    const patchJson = JSON.stringify(patch);
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET schema = jsonb_set(
         schema, '{${kind}}',
         (
           SELECT jsonb_agg(
             CASE WHEN elem->>'id' = $1 THEN elem || $2::jsonb ELSE elem END
           ) FROM jsonb_array_elements(schema->'${kind}') AS elem
         )
       ), revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $3::uuid AND revision = $4 AND archived_at IS NULL
       RETURNING id::text AS id, name, status, revision, schema`,
      [elementId, patchJson, workflowId, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  async removeSchemaElement(
    workflowId: string,
    kind: 'sections' | 'fields',
    elementId: string,
    revision: number,
  ): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET schema = jsonb_set(
         schema, '{${kind}}',
         (
           SELECT jsonb_agg(elem)
           FROM jsonb_array_elements(schema->'${kind}') AS elem
           WHERE elem->>'id' != $1
         )
       ), revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $2::uuid AND revision = $3 AND archived_at IS NULL
       RETURNING id::text AS id, name, status, revision, schema`,
      [elementId, workflowId, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  async reorder(
    workflowId: string,
    sectionOrder: string[] | undefined,
    fieldOrder: Record<string, string[]> | undefined,
    revision: number,
  ): Promise<Row> {
    const current = await this.findById(workflowId);
    const schema = current.schema as Record<string, unknown>;
    const sections = (schema.sections as Row[]) ?? [];
    const fields = (schema.fields as Row[]) ?? [];

    let updatedSections = sections;
    if (sectionOrder) {
      const byId = new Map(sections.map((s) => [s.id as string, s]));
      updatedSections = sectionOrder
        .map((sid, idx): Row => ({
          ...(byId.get(sid) ?? {}),
          id: sid,
          position: idx,
        }))
        .filter((s) => byId.has(s.id as string));
    }

    let updatedFields = fields;
    if (fieldOrder) {
      const byId = new Map(fields.map((f) => [f.id as string, f]));
      updatedFields = [];
      let globalIdx = 0;
      for (const [sectionId, fids] of Object.entries(fieldOrder)) {
        for (const fid of fids) {
          const field = byId.get(fid);
          if (field)
            updatedFields.push({ ...field, sectionId, position: globalIdx++ });
        }
      }
      // append fields not in fieldOrder
      for (const field of fields) {
        if (!updatedFields.find((f) => f.id === field.id)) {
          updatedFields.push({ ...field, position: globalIdx++ });
        }
      }
    }

    const newSchema = {
      ...schema,
      sections: updatedSections,
      fields: updatedFields,
    };
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts SET schema = $1::jsonb, revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $2::uuid AND revision = $3 AND archived_at IS NULL
       RETURNING id::text AS id, name, status, revision, schema`,
      [JSON.stringify(newSchema), workflowId, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }
}
