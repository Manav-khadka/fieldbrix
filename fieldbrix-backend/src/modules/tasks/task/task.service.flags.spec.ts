import { TaskService } from './task.service';
import type { TaskRepository } from './task.repository';

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findDeadLetteredTaskIds: jest.fn().mockResolvedValue(new Set<string>()),
    ...overrides,
  } as unknown as TaskRepository;
}

describe('TaskService — computed flags on read', () => {
  it('adds OVERDUE to a task past its due date', async () => {
    const pastDue = new Date(Date.now() - 60_000).toISOString();
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        dueAt: pastDue,
        flags: [],
      }),
    });
    const service = new TaskService(repo);
    const task = await service.get('task-1');
    expect(task.flags).toContain('OVERDUE');
  });

  it('adds SYNC_PENDING for a task with a recent dead-lettered outbox event', async () => {
    const repo = makeRepo({
      findDeadLetteredTaskIds: jest.fn().mockResolvedValue(new Set(['task-1'])),
      findById: jest.fn().mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        dueAt: null,
        flags: [],
      }),
    });
    const service = new TaskService(repo);
    const task = await service.get('task-1');
    expect(task.flags).toContain('SYNC_PENDING');
  });

  it('does not flag a task not present in the dead-letter set', async () => {
    const repo = makeRepo({
      findDeadLetteredTaskIds: jest
        .fn()
        .mockResolvedValue(new Set(['some-other-task'])),
      findById: jest.fn().mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        dueAt: null,
        flags: [],
      }),
    });
    const service = new TaskService(repo);
    const task = await service.get('task-1');
    expect(task.flags).not.toContain('SYNC_PENDING');
  });

  it('preserves explicit stored flags alongside computed ones', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        dueAt: null,
        flags: ['CUSTOMER_UNAVAILABLE'],
      }),
    });
    const service = new TaskService(repo);
    const task = await service.get('task-1');
    expect(task.flags).toContain('CUSTOMER_UNAVAILABLE');
  });

  it('computes flags for every item in a list result', async () => {
    const pastDue = new Date(Date.now() - 60_000).toISOString();
    const repo = makeRepo({
      list: jest.fn().mockResolvedValue({
        items: [
          { id: 'task-1', status: 'IN_PROGRESS', dueAt: pastDue, flags: [] },
          { id: 'task-2', status: 'DRAFT', dueAt: null, flags: [] },
        ],
        total: 2,
        page: 1,
        limit: 20,
      }),
    });
    const service = new TaskService(repo);
    const result = await service.list({});
    expect(result.items[0].flags).toContain('OVERDUE');
    expect(result.items[1].flags).toEqual([]);
  });
});
