import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { TaskRepository } from './task.repository';
import { computeTimeBasedFlags, mergeTaskFlags } from './task-flags';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  ListTasksQueryDto,
} from './task.dto';
import { TaskFieldProfileRepository } from '../task-field-profile/task-field-profile.repository';

const IMMUTABLE_FIELDS = ['number', 'workflowVersionId', 'taskNumber'] as const;

type Row = Record<string, unknown>;

@Injectable()
export class TaskService {
  constructor(
    private readonly repo: TaskRepository,
    @Optional()
    private readonly profiles?: TaskFieldProfileRepository,
  ) {}

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
    let searchableCustomFields: string[] | undefined;
    if (query.customerId && query.workflowId && this.profiles) {
      const profiles = await this.profiles.list(
        query.customerId,
        query.workflowId,
      );
      const profile = profiles.items[0];
      if (profile) {
        searchableCustomFields = profile.fieldDefinitions
          .filter((field) => field.searchable)
          .map((field) => field.key);
        if (
          query.customField &&
          !profile.fieldDefinitions.some(
            (field) => field.key === query.customField && field.filterable,
          )
        )
          throw new BadRequestException('TASK_FIELD_NOT_FILTERABLE');
      }
    }
    const result = await this.repo.list(query, searchableCustomFields);
    return { ...result, items: await this.withComputedFlags(result.items) };
  }

  async map(query: ListTasksQueryDto) {
    const items = await this.repo.map(query);
    return { items: await this.withComputedFlags(items), total: items.length };
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
      if ((err as { code?: string }).code === '23505')
        throw new BadRequestException('DUPLICATE_TASK_REFERENCE');
      throw err;
    }
  }

  /**
   * Import-safe task upsert. The client reference is the durable identity;
   * workflow pins and ownership stay immutable once a task exists, while the
   * dispatch details may be refreshed by an explicit update-mode import.
   */
  async importTask(
    dto: CreateTaskDto & { externalReferenceId: string; customerId: string },
    duplicateMode: 'reject' | 'skip' | 'update',
  ): Promise<
    | { outcome: 'CREATED' | 'UPDATED'; entityId: string }
    | { outcome: 'SKIPPED' }
    | { outcome: 'ERROR'; errorCode: string; message: string }
  > {
    const reference = dto.externalReferenceId.trim();
    const existing = await this.repo.findByExternalReference(
      reference,
      dto.customerId,
    );
    if (existing) {
      if (duplicateMode === 'reject')
        return {
          outcome: 'ERROR',
          errorCode: 'DUPLICATE_TASK_REFERENCE',
          message: `Task reference ${reference} already exists`,
        };
      if (duplicateMode === 'skip') return { outcome: 'SKIPPED' };
      const updated = await this.repo.update(
        String(existing.id),
        {
          description: dto.description,
          instructions: dto.instructions,
          scheduledAt: dto.scheduledAt,
          dueAt: dto.dueAt,
          priority: dto.priority,
          contactPhone: dto.contactPhone,
          latitude: dto.latitude,
          longitude: dto.longitude,
          customFields: dto.customFields,
        },
        Number(existing.revision),
      );
      return { outcome: 'UPDATED', entityId: String(updated.id) };
    }

    try {
      const created = await this.create({
        ...dto,
        externalReferenceId: reference,
      });
      return { outcome: 'CREATED', entityId: String(created.id) };
    } catch (error) {
      return {
        outcome: 'ERROR',
        errorCode:
          (error as { message?: string }).message ?? 'TASK_IMPORT_FAILED',
        message:
          (error as { message?: string }).message ?? 'Unable to import task',
      };
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
