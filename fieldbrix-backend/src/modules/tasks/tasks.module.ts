import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { PlatformModule } from '../platform/platform.module';

import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { TaskRepository } from './task/task.repository';

import { TaskAssignmentController } from './assignment/task-assignment.controller';
import { TaskAssignmentService } from './assignment/task-assignment.service';

import { TaskTransitionController } from './transition/task-transition.controller';
import { TaskTransitionService } from './transition/task-transition.service';

import { TaskAttachmentController } from './attachment/task-attachment.controller';
import { TaskAttachmentService } from './attachment/task-attachment.service';

import { TaskHistoryController } from './history/task-history.controller';
import { TaskHistoryService } from './history/task-history.service';

import { RecurrenceController } from './recurrence/recurrence.controller';
import { RecurrenceService } from './recurrence/recurrence.service';
import { RecurrenceRepository } from './recurrence/recurrence.repository';

import { TaskRunController } from './execution/task-run.controller';
import { TaskRunService } from './execution/task-run.service';
import { TaskRunRepository } from './execution/task-run.repository';

import { SyncController } from './sync/sync.controller';
import { SyncService } from './sync/sync.service';
import { SyncRepository } from './sync/sync.repository';

import { ReviewController } from './review/review.controller';
import { ReviewService } from './review/review.service';
import { ReviewRepository } from './review/review.repository';

@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
    IdempotencyModule,
    PlatformModule,
  ],
  controllers: [
    ReviewController,
    RecurrenceController,
    TaskRunController,
    SyncController,
    TaskAssignmentController,
    TaskTransitionController,
    TaskAttachmentController,
    TaskHistoryController,
    TaskController,
  ],
  providers: [
    TaskService,
    TaskRepository,
    TaskAssignmentService,
    TaskTransitionService,
    TaskAttachmentService,
    TaskHistoryService,
    RecurrenceService,
    RecurrenceRepository,
    TaskRunService,
    TaskRunRepository,
    SyncService,
    SyncRepository,
    ReviewService,
    ReviewRepository,
  ],
  exports: [
    TaskService,
    RecurrenceService,
    TaskRunService,
    SyncService,
    ReviewService,
  ],
})
export class TasksModule {}
