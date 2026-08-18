import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { PlatformService } from '../../platform/platform/platform.service';
import { SyncBatchDto } from './sync.dto';

@Controller('sync')
@UseGuards(PermissionGuard)
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly platform: PlatformService,
  ) {}

  private getUserId(headers: Record<string, string>): string {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    const user = this.platform.requireUser(token);
    return user.id;
  }

  @Post('batch')
  processBatch(
    @Headers() headers: Record<string, string>,
    @Body() body: SyncBatchDto,
  ) {
    const userId = this.getUserId(headers);
    return this.syncService.processBatch(userId, body);
  }
}
