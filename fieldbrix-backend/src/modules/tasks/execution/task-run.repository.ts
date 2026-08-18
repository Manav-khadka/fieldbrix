import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { rowToCamelCase } from '../../master-data/support/case';

export type TaskRunRecord = {
  id: string;
  taskId: string;
  workerId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  pausedAt?: string;
  checkInGps?: Record<string, unknown>;
  checkOutGps?: Record<string, unknown>;
  targetMatchStatus: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class TaskRunRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByTaskId(taskId: string): Promise<TaskRunRecord[]> {
    const rows = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT tr.*, tr.id::text AS id, tr.task_id::text AS "taskId", tr.worker_id::text AS "workerId"
       FROM task_runs tr
       WHERE tr.task_id = $1::uuid
       ORDER BY tr.created_at DESC`,
      [taskId],
    );
    return rows.map((r) => rowToCamelCase<TaskRunRecord>(r));
  }

  async findById(id: string): Promise<TaskRunRecord | undefined> {
    const rows = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT tr.*, tr.id::text AS id, tr.task_id::text AS "taskId", tr.worker_id::text AS "workerId"
       FROM task_runs tr
       WHERE tr.id = $1::uuid`,
      [id],
    );
    return rows[0] ? rowToCamelCase<TaskRunRecord>(rows[0]) : undefined;
  }

  async findOrFail(id: string): Promise<TaskRunRecord> {
    const run = await this.findById(id);
    if (!run) throw new NotFoundException('TASK_RUN_NOT_FOUND');
    return run;
  }

  async create(payload: {
    taskId: string;
    workerId: string;
    checkInGps?: Record<string, unknown>;
    targetMatchStatus?: string;
  }): Promise<TaskRunRecord> {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `INSERT INTO task_runs (tenant_id, task_id, worker_id, check_in_gps, target_match_status)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2::uuid, $3, $4)
       RETURNING *, id::text AS id`,
      [
        payload.taskId,
        payload.workerId,
        payload.checkInGps ? JSON.stringify(payload.checkInGps) : null,
        payload.targetMatchStatus ?? 'UNVERIFIED',
      ],
    );
    return rowToCamelCase<TaskRunRecord>(result[0]);
  }

  async saveAnswer(payload: {
    runId: string;
    sectionId: string;
    fieldKey: string;
    value: unknown;
    validationOutcome?: string;
  }) {
    await this.database.tenantQuery(
      `INSERT INTO task_answers (tenant_id, run_id, section_id, field_key, value_json, validation_outcome)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2, $3, $4::jsonb, $5)
       ON CONFLICT (tenant_id, run_id, field_key)
       DO UPDATE SET value_json = EXCLUDED.value_json, validation_outcome = EXCLUDED.validation_outcome, updated_at = now()`,
      [
        payload.runId,
        payload.sectionId,
        payload.fieldKey,
        JSON.stringify(payload.value),
        payload.validationOutcome ?? 'VALID',
      ],
    );
  }

  async recordPart(payload: {
    runId: string;
    partId?: string;
    quantity: number;
    unit: string;
    oldPartReturned?: boolean;
    notes?: string;
  }) {
    await this.database.tenantQuery(
      `INSERT INTO parts_used (tenant_id, run_id, part_id, quantity, unit, old_part_returned, notes)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2::uuid, $3, $4, $5, $6)`,
      [
        payload.runId,
        payload.partId ?? null,
        payload.quantity,
        payload.unit,
        payload.oldPartReturned ?? false,
        payload.notes ?? null,
      ],
    );
  }

  async recordEvidence(payload: {
    runId?: string;
    taskId?: string;
    uploadId: string;
    category?: string;
    checksum?: string;
    geoLocation?: Record<string, unknown>;
    note?: string;
  }) {
    await this.database.tenantQuery(
      `INSERT INTO evidence_files (tenant_id, run_id, task_id, upload_id, category, checksum, geo_location, note)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7)`,
      [
        payload.runId ?? null,
        payload.taskId ?? null,
        payload.uploadId,
        payload.category ?? 'PHOTO',
        payload.checksum ?? null,
        payload.geoLocation ? JSON.stringify(payload.geoLocation) : null,
        payload.note ?? null,
      ],
    );
  }

  async registerTargetRequest(payload: {
    siteId: string;
    qrIdentity: string;
    equipmentName: string;
    equipmentType?: string;
    requestedBy: string;
  }) {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `INSERT INTO target_registration_requests (tenant_id, site_id, qr_identity, equipment_name, equipment_type, requested_by)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2, $3, $4, $5::uuid)
       RETURNING *, id::text AS id`,
      [
        payload.siteId,
        payload.qrIdentity,
        payload.equipmentName,
        payload.equipmentType ?? null,
        payload.requestedBy,
      ],
    );
    return rowToCamelCase(result[0]);
  }
}
