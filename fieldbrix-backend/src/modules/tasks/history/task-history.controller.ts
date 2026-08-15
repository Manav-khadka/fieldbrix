import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TaskHistoryService } from './task-history.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';

@Controller()
@UseGuards(PermissionGuard)
export class TaskHistoryController {
  constructor(private readonly historyService: TaskHistoryService) {}

  @Permission('tasks.history.view')
  @Get('tasks/:id/history')
  history(@Param('id') id: string) {
    return this.historyService.getHistory(id);
  }

  @Permission('tasks.assign')
  @Get('scheduling/capacity')
  capacity() {
    return this.historyService.capacity();
  }
}
