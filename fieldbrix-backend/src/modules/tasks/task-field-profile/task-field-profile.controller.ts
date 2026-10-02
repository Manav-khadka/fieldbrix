import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import {
  ListTaskFieldProfilesQueryDto,
  UpsertTaskFieldProfileDto,
} from './task-field-profile.dto';
import { TaskFieldProfileService } from './task-field-profile.service';

@Controller('task-field-profiles')
@UseGuards(PermissionGuard)
export class TaskFieldProfileController {
  constructor(private readonly profiles: TaskFieldProfileService) {}

  @Permission('tasks.view')
  @Get()
  list(@Query() query: ListTaskFieldProfilesQueryDto) {
    return this.profiles.list(query);
  }

  @Permission('tasks.edit')
  @Put()
  upsert(@Body() body: UpsertTaskFieldProfileDto) {
    return this.profiles.upsert(body);
  }
}
