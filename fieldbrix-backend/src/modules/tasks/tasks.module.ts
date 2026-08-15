import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';

import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { TaskRepository } from './task/task.repository';

import { TaskAssignmentController } from './assignment/task-assignment.controller';
import { TaskAssignmentService } from './assignment/task-assignment.service';

import { TaskTransitionController } from './transition/task-transition.controller';
import { TaskTransitionService } from './transition/task-transition.service';

import { TaskAttachmentController } from './attachment/task-attachment.controller';

import { TaskHistoryController } from './history/task-history.controller';
import { TaskHistoryService } from './history/task-history.service';

@Module({
  imports: [DatabaseModule, AuthorizationModule, IdempotencyModule],
  controllers: [
    TaskController,
    TaskAssignmentController,
    TaskTransitionController,
    TaskAttachmentController,
    TaskHistoryController,
  ],
  providers: [
    TaskService,
    TaskRepository,
    TaskAssignmentService,
    TaskTransitionService,
    TaskHistoryService,
  ],
})
export class TasksModule {}
