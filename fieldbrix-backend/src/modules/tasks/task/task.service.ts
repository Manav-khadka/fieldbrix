import { BadRequestException, Injectable } from '@nestjs/common';
import { TaskRepository } from './task.repository';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  ListTasksQueryDto,
} from './task.dto';

const IMMUTABLE_FIELDS = ['number', 'workflowVersionId', 'taskNumber'] as const;

@Injectable()
export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  list(query: ListTasksQueryDto) {
    return this.repo.list(query);
  }

  get(id: string) {
    return this.repo.findById(id);
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
