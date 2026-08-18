import { SyncService } from './sync.service';
import { SyncRepository } from './sync.repository';
import { TaskRunService } from '../execution/task-run.service';

describe('SyncService', () => {
  let service: SyncService;
  let repo: jest.Mocked<SyncRepository>;
  let taskRunService: jest.Mocked<TaskRunService>;

  beforeEach(() => {
    repo = {
      applyMutation: jest.fn(),
    } as unknown as jest.Mocked<SyncRepository>;

    taskRunService = {
      saveAnswer: jest.fn(),
      recordPart: jest.fn(),
      recordEvidence: jest.fn(),
    } as unknown as jest.Mocked<TaskRunService>;

    service = new SyncService(repo, taskRunService);
  });

  it('processes batch offline mutations atomically and records outcomes', async () => {
    repo.applyMutation.mockResolvedValue({
      id: 'mut-rec-1',
      deviceId: 'dev-1',
      clientMutationId: '11111111-1111-1111-1111-111111111111',
      entityType: 'answer',
      entityId: 'run-1',
      action: 'save',
      payload: { sectionId: 'sec-1', fieldKey: 'temp', value: 24.5 },
      status: 'APPLIED',
      clientOccurredAt: '2026-08-19T00:00:00Z',
      serverReceivedAt: '2026-08-19T00:05:00Z',
    });

    const result = await service.processBatch('user-1', {
      deviceId: 'dev-1',
      mutations: [
        {
          clientMutationId: '11111111-1111-1111-1111-111111111111',
          entityType: 'answer',
          entityId: 'run-1',
          action: 'save',
          payload: { sectionId: 'sec-1', fieldKey: 'temp', value: 24.5 },
          clientOccurredAt: '2026-08-19T00:00:00Z',
        },
      ],
    });

    expect(result.processed).toBe(1);
    expect(result.mutations[0].status).toBe('APPLIED');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(taskRunService.saveAnswer).toHaveBeenCalledWith('run-1', {
      sectionId: 'sec-1',
      fieldKey: 'temp',
      value: 24.5,
    });
  });
});
