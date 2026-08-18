import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { rowToCamelCase } from '../../master-data/support/case';

export type SyncMutationRecord = {
  id: string;
  deviceId: string;
  userId?: string;
  clientMutationId: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  status: string;
  errorDetails?: string;
  clientOccurredAt: string;
  serverReceivedAt: string;
};

@Injectable()
export class SyncRepository {
  constructor(private readonly database: DatabaseService) {}

  async applyMutation(payload: {
    deviceId: string;
    userId?: string;
    clientMutationId: string;
    entityType: string;
    entityId: string;
    action: string;
    payload: Record<string, unknown>;
    status?: string;
    errorDetails?: string;
    clientOccurredAt: string;
  }): Promise<SyncMutationRecord> {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `INSERT INTO sync_mutations (
        tenant_id, device_id, user_id, client_mutation_id,
        entity_type, entity_id, action, payload, status, error_details, client_occurred_at
      ) VALUES (
        current_setting('app.tenant_id', true)::uuid, $1, $2::uuid, $3::uuid,
        $4, $5, $6, $7::jsonb, $8, $9, $10::timestamptz
      )
      ON CONFLICT (tenant_id, client_mutation_id) DO UPDATE
        SET server_received_at = now()
      RETURNING *, id::text AS id`,
      [
        payload.deviceId,
        payload.userId ?? null,
        payload.clientMutationId,
        payload.entityType,
        payload.entityId,
        payload.action,
        JSON.stringify(payload.payload),
        payload.status ?? 'APPLIED',
        payload.errorDetails ?? null,
        payload.clientOccurredAt,
      ],
    );
    return rowToCamelCase<SyncMutationRecord>(result[0]);
  }
}
