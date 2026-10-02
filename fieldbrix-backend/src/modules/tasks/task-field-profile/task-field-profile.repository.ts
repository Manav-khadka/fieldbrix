import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import type { TaskFieldDefinitionDto } from './task-field-profile.dto';

export type TaskFieldProfileRow = {
  id: string;
  customerId: string;
  workflowId: string;
  entityLabel: string;
  columnMapping: Record<string, string>;
  fieldDefinitions: TaskFieldDefinitionDto[];
  visibleColumns: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
};

type ProfilePayload = {
  customerId: string;
  workflowId: string;
  entityLabel: string;
  columnMapping: Record<string, string>;
  fields: TaskFieldDefinitionDto[];
  visibleColumns: string[];
};

const PROFILE_SELECT = `
  id::text AS id,
  customer_id::text AS "customerId",
  workflow_id::text AS "workflowId",
  entity_label AS "entityLabel",
  column_mapping AS "columnMapping",
  field_definitions AS "fieldDefinitions",
  visible_columns AS "visibleColumns",
  revision,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

@Injectable()
export class TaskFieldProfileRepository {
  constructor(private readonly db: DatabaseService) {}

  async list(customerId?: string, workflowId?: string) {
    const values: unknown[] = [];
    const where: string[] = [];
    if (customerId) {
      values.push(customerId);
      where.push(`customer_id = $${values.length}::uuid`);
    }
    if (workflowId) {
      values.push(workflowId);
      where.push(`workflow_id = $${values.length}::uuid`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const items = await this.db.tenantQuery<TaskFieldProfileRow>(
      `SELECT ${PROFILE_SELECT}
       FROM task_field_profiles ${clause}
       ORDER BY updated_at DESC`,
      values,
    );
    return { items };
  }

  upsert(payload: ProfilePayload): Promise<TaskFieldProfileRow> {
    return this.upsertResolved(payload);
  }

  async upsertForVersion(
    payload: Omit<ProfilePayload, 'workflowId'> & { workflowVersionId: string },
  ): Promise<TaskFieldProfileRow | null> {
    const versions = await this.db.tenantQuery<{ workflowId: string }>(
      `SELECT workflow_id::text AS "workflowId"
       FROM workflow_versions WHERE id = $1::uuid`,
      [payload.workflowVersionId],
    );
    if (!versions[0]) return null;
    return this.upsertResolved({
      ...payload,
      workflowId: versions[0].workflowId,
    });
  }

  private async upsertResolved(
    payload: ProfilePayload,
  ): Promise<TaskFieldProfileRow> {
    const rows = await this.db.tenantQuery<TaskFieldProfileRow>(
      `INSERT INTO task_field_profiles
         (tenant_id, customer_id, workflow_id, entity_label, column_mapping, field_definitions, visible_columns)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb, $6::jsonb)
       ON CONFLICT (tenant_id, customer_id, workflow_id) DO UPDATE
       SET entity_label = EXCLUDED.entity_label,
           column_mapping = EXCLUDED.column_mapping,
           field_definitions = EXCLUDED.field_definitions,
           visible_columns = EXCLUDED.visible_columns,
           revision = task_field_profiles.revision + 1,
           updated_at = clock_timestamp()
       RETURNING ${PROFILE_SELECT}`,
      [
        payload.customerId,
        payload.workflowId,
        payload.entityLabel,
        JSON.stringify(payload.columnMapping),
        JSON.stringify(payload.fields),
        JSON.stringify(payload.visibleColumns),
      ],
    );
    return rows[0];
  }
}
