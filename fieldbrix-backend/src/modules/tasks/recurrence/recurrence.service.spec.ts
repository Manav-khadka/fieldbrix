import { RecurrenceService } from './recurrence.service';
import {
  RecurrenceRecord,
  RecurrenceRepository,
} from './recurrence.repository';
import { TaskService } from '../task/task.service';

describe('RecurrenceService', () => {
  let service: RecurrenceService;
  let repo: jest.Mocked<RecurrenceRepository>;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(() => {
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findOrFail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      recordException: jest.fn(),
    } as unknown as jest.Mocked<RecurrenceRepository>;

    taskService = {
      create: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<TaskService>;

    service = new RecurrenceService(repo, taskService);
  });

  it('calculates daily upcoming occurrences within lookahead window', () => {
    const today = new Date();
    const plan: RecurrenceRecord = {
      id: 'rec-1',
      name: 'Daily HVAC Check',
      frequency: 'DAILY',
      intervalCount: 1,
      lookaheadDays: 7,
      customerId: 'cust-1',
      siteId: 'site-1',
      workflowVersionId: 'wf-1',
      lead: false,
      priority: 'NORMAL',
      instructions: 'Check temperature',
      active: true,
      startDate: today.toISOString().split('T')[0],
      revision: 1,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    };

    const dates = service.calculateUpcomingOccurrences(plan, 5);
    expect(dates.length).toBeGreaterThanOrEqual(5);
  });

  it('handles rescheduling exception by generating a new task with reason', async () => {
    repo.findOrFail.mockResolvedValue({
      id: 'rec-1',
      name: 'Weekly Maintenance',
      workflowVersionId: 'wf-1',
      customerId: 'cust-1',
      siteId: 'site-1',
      priority: 'HIGH',
      instructions: 'Clean filters',
    } as unknown as RecurrenceRecord);

    taskService.create.mockResolvedValue({
      id: 'task-new-1',
      taskNumber: 'TSK-2001',
    });

    const result = await service.handleException('rec-1', {
      occurrenceDate: '2026-08-25',
      action: 'RESCHEDULE',
      newDate: '2026-08-27',
      reason: 'Customer requested delay',
    });

    expect(result.action).toBe('RESCHEDULE');
    expect(result.newTaskId).toBe('task-new-1');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(repo.recordException).toHaveBeenCalledWith(
      'rec-1',
      '2026-08-25',
      'RESCHEDULE',
      'Customer requested delay',
      'task-new-1',
    );
  });
});
