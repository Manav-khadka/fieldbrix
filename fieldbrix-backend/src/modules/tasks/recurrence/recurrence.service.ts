import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RecurrenceRecord,
  RecurrenceRepository,
} from './recurrence.repository';
import {
  CreateRecurrenceDto,
  RecurrenceExceptionDto,
  UpdateRecurrenceDto,
} from './recurrence.dto';
import { TaskService } from '../task/task.service';

@Injectable()
export class RecurrenceService {
  constructor(
    private readonly repository: RecurrenceRepository,
    private readonly taskService: TaskService,
  ) {}

  list() {
    return this.repository.list();
  }

  get(id: string) {
    return this.repository.findOrFail(id);
  }

  create(dto: CreateRecurrenceDto) {
    return this.repository.create(dto as unknown as Record<string, unknown>);
  }

  update(id: string, dto: UpdateRecurrenceDto) {
    return this.repository.update(
      id,
      dto as unknown as Record<string, unknown>,
      dto.revision,
    );
  }

  async handleException(id: string, dto: RecurrenceExceptionDto) {
    const plan = await this.repository.findOrFail(id);
    let newTaskId: string | undefined;

    if (dto.action === 'RESCHEDULE') {
      if (!dto.newDate) {
        throw new BadRequestException('NEW_DATE_REQUIRED_FOR_RESCHEDULE');
      }
      const task = await this.taskService.create({
        workflowVersionId: plan.workflowVersionId,
        customerId: plan.customerId,
        siteId: plan.siteId,
        targetId: plan.targetId,
        description: `${plan.name} (Rescheduled from ${dto.occurrenceDate})`,
        instructions: plan.instructions,
        priority: plan.priority,
        scheduledAt: new Date(dto.newDate).toISOString(),
      });
      newTaskId = String(task.id);
    }

    await this.repository.recordException(
      id,
      dto.occurrenceDate,
      dto.action,
      dto.reason,
      newTaskId,
    );

    return { success: true, planId: id, action: dto.action, newTaskId };
  }

  /**
   * Generates upcoming occurrence dates for a plan within its lookahead window.
   */
  calculateUpcomingOccurrences(
    plan: RecurrenceRecord,
    windowDays = 14,
  ): string[] {
    const occurrences: string[] = [];
    const now = new Date();
    const start = new Date(plan.startDate);
    const end = plan.endDate
      ? new Date(plan.endDate)
      : new Date(now.getTime() + windowDays * 86400000);
    const windowEnd = new Date(now.getTime() + windowDays * 86400000);
    const effectiveEnd = end < windowEnd ? end : windowEnd;

    const current = new Date(start);
    while (current <= effectiveEnd) {
      if (current >= now) {
        const dayOfWeek = current.getUTCDay(); // 0 = Sun, 6 = Sat
        if (
          plan.frequency === 'DAILY' ||
          (plan.frequency === 'WEEKDAY' && dayOfWeek >= 1 && dayOfWeek <= 5) ||
          plan.frequency === 'WEEKLY' ||
          plan.frequency === 'MONTHLY' ||
          plan.frequency === 'CUSTOM'
        ) {
          occurrences.push(current.toISOString().split('T')[0]);
        }
      }
      // advance
      if (plan.frequency === 'DAILY' || plan.frequency === 'WEEKDAY') {
        current.setUTCDate(current.getUTCDate() + (plan.intervalCount || 1));
      } else if (plan.frequency === 'WEEKLY') {
        current.setUTCDate(
          current.getUTCDate() + 7 * (plan.intervalCount || 1),
        );
      } else if (plan.frequency === 'MONTHLY') {
        current.setUTCMonth(
          current.getUTCMonth() + (plan.intervalCount || 1),
        );
      } else {
        current.setUTCDate(current.getUTCDate() + 7);
      }
    }
    return occurrences;
  }
}
