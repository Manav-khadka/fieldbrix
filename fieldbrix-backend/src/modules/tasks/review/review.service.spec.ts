import { ReviewService } from './review.service';
import { ReviewRepository } from './review.repository';
import { TaskService } from '../task/task.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let repo: jest.Mocked<ReviewRepository>;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(() => {
    repo = {
      listReviewQueue: jest.fn(),
      saveConfirmation: jest.fn(),
      recordReview: jest.fn(),
    } as unknown as jest.Mocked<ReviewRepository>;

    taskService = {
      get: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TaskService>;

    service = new ReviewService(repo, taskService);
  });

  it('records customer confirmation with summary hash and status', async () => {
    repo.saveConfirmation.mockResolvedValue({
      id: 'conf-1',
      taskId: 'task-1',
      status: 'SIGNED',
      signerName: 'Ahmed Al-Harthy',
      signerDesignation: 'Facility Manager',
      summaryHash: 'abc123sha256hash',
      workerDeclaration: true,
      confirmedAt: new Date().toISOString(),
    });

    const result = await service.saveConfirmation('task-1', {
      status: 'SIGNED',
      signerName: 'Ahmed Al-Harthy',
      signerDesignation: 'Facility Manager',
      summaryHash: 'abc123sha256hash',
      workerDeclaration: true,
    });

    expect(result.status).toBe('SIGNED');
    expect(result.summaryHash).toBe('abc123sha256hash');
    expect(repo.saveConfirmation).toHaveBeenCalled();
  });

  it('creates linked follow-up task and approves original task', async () => {
    taskService.get.mockResolvedValue({
      id: 'task-1',
      workflowVersionId: 'wf-v1',
      customerId: 'cust-1',
      siteId: 'site-1',
      instructions: 'Original instructions',
      priority: 'NORMAL',
    } as any);

    taskService.create.mockResolvedValue({
      id: 'task-followup-1',
      taskNumber: 'TSK-9901',
    } as any);

    const followUp = await service.createFollowUp('task-1', 'rev-user-1', {
      description: 'Physical revisit required for leak check',
      scheduledAt: '2026-08-28T09:00:00Z',
    });

    expect(followUp.id).toBe('task-followup-1');
    expect(repo.recordReview).toHaveBeenCalledWith('task-1', 'rev-user-1', {
      status: 'APPROVED',
      comments: 'Approved with follow-up task TSK-9901',
      followUpTaskId: 'task-followup-1',
    });
  });
});
