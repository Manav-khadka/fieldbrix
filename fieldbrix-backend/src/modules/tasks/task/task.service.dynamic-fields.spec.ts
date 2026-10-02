import { TaskService } from './task.service';
import type { TaskRepository } from './task.repository';
import type { TaskFieldProfileRepository } from '../task-field-profile/task-field-profile.repository';

function makeService() {
  const taskRepository = {
    list: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    findDeadLetteredTaskIds: jest.fn().mockResolvedValue(new Set()),
  } as unknown as TaskRepository;
  const profileRepository = {
    list: jest.fn().mockResolvedValue({
      items: [
        {
          fieldDefinitions: [
            {
              key: 'account_name',
              searchable: true,
              filterable: true,
            },
            {
              key: 'internal_note',
              searchable: false,
              filterable: false,
            },
          ],
        },
      ],
    }),
  } as unknown as TaskFieldProfileRepository;
  return {
    service: new TaskService(taskRepository, profileRepository),
    taskRepository,
  };
}

describe('TaskService dynamic custom-field policy', () => {
  it('passes only profile fields marked searchable to the repository', async () => {
    const { service, taskRepository } = makeService();
    await service.list({
      customerId: 'customer-1',
      workflowId: 'workflow-1',
      search: 'al noor',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(taskRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'al noor' }),
      ['account_name'],
    );
  });

  it('rejects filters for a field that the profile did not mark filterable', async () => {
    const { service } = makeService();
    await expect(
      service.list({
        customerId: 'customer-1',
        workflowId: 'workflow-1',
        customField: 'internal_note',
        customValue: 'secret',
      }),
    ).rejects.toThrow('TASK_FIELD_NOT_FILTERABLE');
  });
});
