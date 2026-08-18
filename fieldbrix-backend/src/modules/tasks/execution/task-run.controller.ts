import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { TaskRunService } from './task-run.service';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { PlatformService } from '../../platform/platform/platform.service';
import {
  RecordEvidenceDto,
  RecordPartUsedDto,
  RegisterTargetDto,
  StartTaskRunDto,
  SubmitAnswersDto,
} from './task-run.dto';

@Controller('tasks')
@UseGuards(PermissionGuard)
export class TaskRunController {
  constructor(
    private readonly taskRunService: TaskRunService,
    private readonly platform: PlatformService,
  ) {}

  private getUserId(headers: Record<string, string>): string {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    const user = this.platform.requireUser(token);
    return user.id;
  }

  @Get(':id/runs')
  listRuns(@Param('id') id: string) {
    return this.taskRunService.listRunsForTask(id);
  }

  @Get('runs/:runId')
  getRun(@Param('runId') runId: string) {
    return this.taskRunService.getRun(runId);
  }

  @Post(':id/runs')
  startRun(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: StartTaskRunDto,
  ) {
    const userId = this.getUserId(headers);
    return this.taskRunService.startRun(id, userId, body);
  }

  @Post('runs/:runId/answers')
  saveAnswer(@Param('runId') runId: string, @Body() body: SubmitAnswersDto) {
    return this.taskRunService.saveAnswer(runId, body);
  }

  @Post('runs/:runId/parts')
  recordPart(@Param('runId') runId: string, @Body() body: RecordPartUsedDto) {
    return this.taskRunService.recordPart(runId, body);
  }

  @Post('runs/:runId/evidence')
  recordEvidence(
    @Param('runId') runId: string,
    @Body() body: RecordEvidenceDto,
  ) {
    return this.taskRunService.recordEvidence(runId, body);
  }

  @Post('target-registrations')
  registerTarget(
    @Headers() headers: Record<string, string>,
    @Body() body: RegisterTargetDto,
  ) {
    const userId = this.getUserId(headers);
    return this.taskRunService.registerTarget(userId, body);
  }
}
