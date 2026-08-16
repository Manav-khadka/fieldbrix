import { BadRequestException, Injectable } from '@nestjs/common';
import { TaskRepository } from './task.repository';
import { computeTimeBasedFlags, mergeTaskFlags } from './task-flags';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  ListTasksQueryDto,
} from './task.dto';

const IMMUTABLE_FIELDS = ['number', 'workflowVersionId', 'taskNumber'] as const;

type Row = Record<string, unknown>;

@Injectable()
export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  private async withComputedFlags(tasks: Row[]): Promise<Row[]> {
    if (tasks.length === 0) return tasks;
    const deadLettered = await this.repo.findDeadLetteredTaskIds();
    return tasks.map((task) => {
      const computed = computeTimeBasedFlags({
        status: String(task.status),
        dueAt: task.dueAt as string | null | undefined,
      });
      if (deadLettered.has(String(task.id))) computed.push('SYNC_PENDING');
      return { ...task, flags: mergeTaskFlags(task.flags, computed) };
    });
  }

  async list(query: ListTasksQueryDto) {
    const result = await this.repo.list(query);
    return { ...result, items: await this.withComputedFlags(result.items) };
  }

  async get(id: string) {
    const task = await this.repo.findById(id);
    const [withFlags] = await this.withComputedFlags([task]);
    return withFlags;
  }

  async create(dto: CreateTaskDto) {
    if (!dto.workflowVersionId?.trim())
      throw new BadRequestException('WORKFLOW_VERSION_ID_REQUIRED');
    try {
      return await this.repo.create(dto as unknown as Record<string, unknown>);
    } catch (err) {
      const message = (err as Error).message;
      if (message === 'PUBLISHED_WORKFLOW_REQUIRED')
        throw new BadRequestException('PUBLISHED_WORKFLOW_REQUIRED');
      if (message === 'WORKFLOW_ARCHIVED')
        throw new BadRequestException('WORKFLOW_ARCHIVED');
      throw err;
    }
  }

  async update(id: string, dto: UpdateTaskDto) {
    for (const field of IMMUTABLE_FIELDS) {
      if (field in (dto as object))
        throw new BadRequestException('IMMUTABLE_TASK_FIELD');
    }
    const current = await this.repo.findById(id);
    const revision = dto.revision ?? (current.revision as number);
    return this.repo.update(id, dto as Record<string, unknown>, revision);
  }
}
