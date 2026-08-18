import { Injectable } from '@nestjs/common';
import { ReviewRepository } from './review.repository';
import {
  CreateFollowUpDto,
  CustomerConfirmationDto,
  TaskReviewDecisionDto,
} from './review.dto';
import { TaskService } from '../task/task.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly repository: ReviewRepository,
    private readonly taskService: TaskService,
  ) {}

  listQueue() {
    return this.repository.listReviewQueue();
  }

  saveConfirmation(taskId: string, dto: CustomerConfirmationDto) {
    return this.repository.saveConfirmation(taskId, {
      status: dto.status,
      signerName: dto.signerName,
      signerDesignation: dto.signerDesignation,
      summaryHash: dto.summaryHash,
      signatureUploadId: dto.signatureUploadId,
      refusalReason: dto.refusalReason,
      workerDeclaration: dto.workerDeclaration,
    });
  }

  recordDecision(
    taskId: string,
    reviewerId: string,
    dto: TaskReviewDecisionDto,
  ) {
    return this.repository.recordReview(taskId, reviewerId, {
      status: dto.status,
      exceptionDecisions: dto.exceptionDecisions,
      comments: dto.comments,
      followUpTaskId: dto.followUpTaskId,
    });
  }

  async createFollowUp(
    originalTaskId: string,
    reviewerId: string,
    dto: CreateFollowUpDto,
  ) {
    const original = (await this.taskService.get(originalTaskId)) as Record<
      string,
      any
    >;
    const followUp = await this.taskService.create({
      workflowVersionId: String(original.workflowVersionId),
      customerId: original.customerId ? String(original.customerId) : undefined,
      siteId: original.siteId ? String(original.siteId) : undefined,
      targetId: original.targetId ? String(original.targetId) : undefined,
      description: dto.description,
      instructions: dto.instructions || (original.instructions as string),
      priority: (original.priority as string) || 'NORMAL',
      scheduledAt: dto.scheduledAt,
    });

    await this.repository.recordReview(originalTaskId, reviewerId, {
      status: 'APPROVED',
      comments: `Approved with follow-up task ${followUp.taskNumber}`,
      followUpTaskId: String(followUp.id),
    });

    return followUp;
  }
}
