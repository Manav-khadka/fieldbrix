import { Module } from '@nestjs/common';
import { PlatformService } from './platform/platform.service';
import { PlatformController } from './platform/platform.controller';
import { PlatformRepository } from './platform.repository/platform.repository';
import { DatabaseModule } from '../database/database.module';
import { TenantContextModule } from '../tenant-context/tenant-context.module';
import { RateLimitGuard } from './guards/rate-limit/rate-limit.guard';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';

@Module({
  imports: [DatabaseModule, TenantContextModule, StorageModule, QueueModule, NotificationsModule, IdempotencyModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformRepository, RateLimitGuard],
  exports: [PlatformService, PlatformRepository, RateLimitGuard]
})
export class PlatformModule {}
