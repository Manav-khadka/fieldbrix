import { Injectable } from '@nestjs/common';
import { SyncRepository } from './sync.repository';
import { SyncBatchDto } from './sync.dto';
import { TaskRunService } from '../execution/task-run.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly repository: SyncRepository,
    private readonly taskRunService: TaskRunService,
  ) {}

  async processBatch(userId: string, dto: SyncBatchDto) {
    const results: Array<{
      clientMutationId: string;
      status: string;
      serverReceivedAt: string;
      errorDetails?: string;
    }> = [];

    for (const item of dto.mutations) {
      let status = 'APPLIED';
      let errorDetails: string | undefined;

      try {
        if (item.entityType === 'answer' && item.action === 'save') {
          const runId = item.entityId;
          const payload = item.payload as {
            sectionId: string;
            fieldKey: string;
            value: unknown;
          };
          await this.taskRunService.saveAnswer(runId, payload);
        } else if (item.entityType === 'part' && item.action === 'record') {
          const runId = item.entityId;
          const payload = item.payload as {
            quantity: number;
            unit: string;
            partId?: string;
            notes?: string;
          };
          await this.taskRunService.recordPart(runId, payload);
        } else if (item.entityType === 'evidence' && item.action === 'record') {
          const runId = item.entityId;
          const payload = item.payload as {
            uploadId: string;
            category?: string;
            checksum?: string;
            note?: string;
          };
          await this.taskRunService.recordEvidence(runId, payload);
        }
      } catch (err) {
        status = 'REJECTED';
        errorDetails = err instanceof Error ? err.message : String(err);
      }

      const rec = await this.repository.applyMutation({
        deviceId: dto.deviceId,
        userId,
        clientMutationId: item.clientMutationId,
        entityType: item.entityType,
        entityId: item.entityId,
        action: item.action,
        payload: item.payload,
        status,
        errorDetails,
        clientOccurredAt: item.clientOccurredAt,
      });

      results.push({
        clientMutationId: item.clientMutationId,
        status: rec.status,
        serverReceivedAt: rec.serverReceivedAt,
        errorDetails: rec.errorDetails,
      });
    }

    return {
      processed: results.length,
      serverTime: new Date().toISOString(),
      mutations: results,
    };
  }
}
