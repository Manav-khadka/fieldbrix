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
import { ReviewService } from './review.service';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PlatformService } from '../../platform/platform/platform.service';
import {
  CreateFollowUpDto,
  CustomerConfirmationDto,
  TaskReviewDecisionDto,
} from './review.dto';

@Controller('tasks')
@UseGuards(PermissionGuard)
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly platform: PlatformService,
  ) {}

  private getUserId(headers: Record<string, string>): string {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    const user = this.platform.requireUser(token);
    return user.id;
  }

  @Permission('tasks.view')
  @Get('review-queue')
  listQueue() {
    return this.reviewService.listQueue();
  }

  @Post(':id/confirmation')
  saveConfirmation(
    @Param('id') id: string,
    @Body() body: CustomerConfirmationDto,
  ) {
    return this.reviewService.saveConfirmation(id, body);
  }

  @Permission('tasks.edit')
  @Post(':id/review-decision')
  recordDecision(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TaskReviewDecisionDto,
  ) {
    const reviewerId = this.getUserId(headers);
    return this.reviewService.recordDecision(id, reviewerId, body);
  }

  @Permission('tasks.edit')
  @Post(':id/follow-up')
  createFollowUp(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: CreateFollowUpDto,
  ) {
    const reviewerId = this.getUserId(headers);
    return this.reviewService.createFollowUp(id, reviewerId, body);
  }
}
