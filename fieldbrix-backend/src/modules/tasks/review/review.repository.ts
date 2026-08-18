import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { rowToCamelCase } from '../../master-data/support/case';

export type CustomerConfirmationRecord = {
  id: string;
  taskId: string;
  runId?: string;
  status: string;
  signerName?: string;
  signerDesignation?: string;
  summaryHash: string;
  signatureUploadId?: string;
  refusalReason?: string;
  workerDeclaration: boolean;
  confirmedAt: string;
};

export type TaskReviewRecord = {
  id: string;
  taskId: string;
  reviewerId: string;
  status: string;
  exceptionDecisions: Record<string, unknown>;
  comments?: string;
  followUpTaskId?: string;
  reviewedAt: string;
};

@Injectable()
export class ReviewRepository {
  constructor(private readonly database: DatabaseService) {}

  async listReviewQueue(): Promise<Record<string, unknown>[]> {
    const rows = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT t.id::text AS id, t.task_number AS "taskNumber", t.description,
              t.status, t.priority, t.scheduled_at AS "scheduledAt",
              t.customer_id::text AS "customerId", t.site_id::text AS "siteId",
              c.name AS "customerName", s.name AS "siteName",
              cc.status AS "confirmationStatus", cc.signer_name AS "signerName",
              tr.status AS "reviewStatus"
       FROM tasks t
       JOIN master_customers c ON c.id = t.customer_id
       JOIN master_sites s ON s.id = t.site_id
       LEFT JOIN customer_confirmations cc ON cc.task_id = t.id
       LEFT JOIN task_reviews tr ON tr.task_id = t.id
       WHERE t.status IN ('COMPLETED', 'IN_PROGRESS', 'PAUSED')
       ORDER BY t.updated_at DESC`,
    );
    return rows.map((r) => rowToCamelCase(r));
  }

  async saveConfirmation(
    taskId: string,
    payload: {
      status: string;
      signerName?: string;
      signerDesignation?: string;
      summaryHash: string;
      signatureUploadId?: string;
      refusalReason?: string;
      workerDeclaration?: boolean;
    },
  ): Promise<CustomerConfirmationRecord> {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `INSERT INTO customer_confirmations (
        tenant_id, task_id, status, signer_name, signer_designation,
        summary_hash, signature_upload_id, refusal_reason, worker_declaration
      ) VALUES (
        current_setting('app.tenant_id', true)::uuid, $1::uuid, $2, $3, $4, $5, $6, $7, $8
      )
      ON CONFLICT (tenant_id, task_id) DO UPDATE
        SET status = EXCLUDED.status,
            signer_name = EXCLUDED.signer_name,
            signer_designation = EXCLUDED.signer_designation,
            summary_hash = EXCLUDED.summary_hash,
            signature_upload_id = EXCLUDED.signature_upload_id,
            refusal_reason = EXCLUDED.refusal_reason,
            worker_declaration = EXCLUDED.worker_declaration,
            confirmed_at = now()
      RETURNING *, id::text AS id`,
      [
        taskId,
        payload.status,
        payload.signerName ?? null,
        payload.signerDesignation ?? null,
        payload.summaryHash,
        payload.signatureUploadId ?? null,
        payload.refusalReason ?? null,
        payload.workerDeclaration ?? true,
      ],
    );
    return rowToCamelCase<CustomerConfirmationRecord>(result[0]);
  }

  async recordReview(
    taskId: string,
    reviewerId: string,
    payload: {
      status: string;
      exceptionDecisions?: Record<string, unknown>;
      comments?: string;
      followUpTaskId?: string;
    },
  ): Promise<TaskReviewRecord> {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `INSERT INTO task_reviews (
        tenant_id, task_id, reviewer_id, status, exception_decisions, comments, follow_up_task_id
      ) VALUES (
        current_setting('app.tenant_id', true)::uuid, $1::uuid, $2::uuid, $3, $4::jsonb, $5, $6::uuid
      )
      RETURNING *, id::text AS id`,
      [
        taskId,
        reviewerId,
        payload.status,
        JSON.stringify(payload.exceptionDecisions ?? {}),
        payload.comments ?? null,
        payload.followUpTaskId ?? null,
      ],
    );
    return rowToCamelCase<TaskReviewRecord>(result[0]);
  }
}
