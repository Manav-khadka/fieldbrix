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
              COALESCE(c.name, 'Customer') AS "customerName",
              COALESCE(s.name, 'Site') AS "siteName",
              cc.status AS "confirmationStatus", cc.signer_name AS "signerName",
              CASE WHEN tvr.verification_mode = 'AUTO' THEN 'AUTO_VERIFIED'
                WHEN COALESCE(rv.approved_count, 0) >= COALESCE(tvr.required_approvals, 1) THEN 'APPROVED'
                WHEN COALESCE(rv.review_count, 0) > 0 THEN 'IN_REVIEW' ELSE 'PENDING' END AS "reviewStatus",
              COALESCE(tvr.verification_mode, 'MANUAL_SUPERVISOR') AS "verificationMode",
              COALESCE(tvr.required_approvals, 1) AS "requiredApprovals",
              COALESCE(rv.approved_count, 0)::int AS "approvedCount"
       FROM tasks t
       LEFT JOIN master_customers c ON c.id = t.customer_id
       LEFT JOIN master_sites s ON s.id = t.site_id
       LEFT JOIN customer_confirmations cc ON cc.task_id = t.id
       LEFT JOIN task_verification_requirements tvr ON tvr.task_id = t.id AND tvr.tenant_id = t.tenant_id
       LEFT JOIN LATERAL (SELECT count(*) AS review_count,
         count(DISTINCT reviewer_id) FILTER (WHERE status = 'APPROVED') AS approved_count
         FROM task_reviews tr WHERE tr.task_id = t.id AND tr.tenant_id = t.tenant_id) rv ON true
       WHERE t.archived_at IS NULL
       ORDER BY t.updated_at DESC`,
    );
    return rows;
  }

  async getConfirmationByTaskId(
    taskId: string,
  ): Promise<CustomerConfirmationRecord | null> {
    const rows = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT *, id::text AS id FROM customer_confirmations WHERE task_id = $1::uuid`,
      [taskId],
    );
    return rows[0] ? rowToCamelCase<CustomerConfirmationRecord>(rows[0]) : null;
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

  async verificationContext(taskId: string, reviewerId: string) {
    const rows = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT COALESCE(tvr.verification_mode, 'MANUAL_SUPERVISOR') AS "verificationMode",
              COALESCE(tvr.required_approvals, 1)::int AS "requiredApprovals",
              (EXISTS (SELECT 1 FROM task_supervisors ts WHERE ts.tenant_id = t.tenant_id
                AND ts.task_id = t.id AND ts.user_id = $2::uuid)
               OR EXISTS (SELECT 1 FROM task_verification_requirements req
                 JOIN team_memberships tm ON tm.tenant_id = req.tenant_id AND tm.team_id = req.quality_team_id
                 WHERE req.tenant_id = t.tenant_id AND req.task_id = t.id AND tm.user_id = $2::uuid AND tm.ends_at IS NULL)) AS authorized
       FROM tasks t LEFT JOIN task_verification_requirements tvr ON tvr.tenant_id = t.tenant_id AND tvr.task_id = t.id
       WHERE t.id = $1::uuid`,
      [taskId, reviewerId],
    );
    return rows[0] ?? null;
  }
}
