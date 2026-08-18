import { TaskService } from './task.service';
import type { TaskRepository } from './task.repository';
import type { CreateTaskDto } from './task.dto';

function makeService() {
  const repo = {
    create: jest
      .fn()
      .mockImplementation((payload: Record<string, unknown>) =>
        Promise.resolve({ id: 'task-1', ...payload }),
      ),
  } as unknown as TaskRepository;
  return { service: new TaskService(repo), repo };
}

describe('TaskService.create — workType / signaturePolicy passthrough', () => {
  it('forwards workType and signaturePolicy to the repository unchanged', async () => {
    const { service, repo } = makeService();
    const dto: CreateTaskDto = {
      workflowVersionId: 'version-1',
      workType: 'COMPLAINT',
      signaturePolicy: { required: true },
    };
    await service.create(dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workType: 'COMPLAINT',
        signaturePolicy: { required: true },
      }),
    );
  });

  it('allows creating a task without workType or signaturePolicy', async () => {
    const { service, repo } = makeService();
    const dto: CreateTaskDto = { workflowVersionId: 'version-1' };
    const result = await service.create(dto);

    expect(result.id).toBe('task-1');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ workflowVersionId: 'version-1' }),
    );
  });
});
