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
import { NotificationsService } from './notifications.service';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { PlatformService } from '../../platform/platform/platform.service';
import { CreateNotificationDto } from './notifications.dto';

@Controller('notifications')
@UseGuards(PermissionGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly platform: PlatformService,
  ) {}

  private getUserId(headers: Record<string, string>): string {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    const user = this.platform.requireUser(token);
    return user.id;
  }

  @Get()
  list(@Headers() headers: Record<string, string>) {
    const userId = this.getUserId(headers);
    return this.notificationsService.listForUser(userId);
  }

  @Post()
  create(@Body() body: CreateNotificationDto) {
    return this.notificationsService.create(body);
  }

  @Post(':id/read')
  async markRead(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(headers);
    await this.notificationsService.markRead(id, userId);
    return { success: true };
  }

  @Post('read-all')
  async markAllRead(@Headers() headers: Record<string, string>) {
    const userId = this.getUserId(headers);
    await this.notificationsService.markAllRead(userId);
    return { success: true };
  }

  @Post(':id/dismiss')
  async dismiss(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(headers);
    await this.notificationsService.dismiss(id, userId);
    return { success: true };
  }
}
