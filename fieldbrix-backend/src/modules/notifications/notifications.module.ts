import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PlatformModule } from '../platform/platform.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { NotificationsService as LegacyNotificationsService } from './notifications/notifications.service';
import { NOTIFICATION_DELIVERY } from './ports/notification-delivery.port/notification-delivery.port';
import { TemporaryEmailAdapter } from './adapters/temporary-email.adapter/temporary-email.adapter';
import { NotificationsController } from './inbox/notifications.controller';
import { NotificationsService } from './inbox/notifications.service';
import { NotificationsRepository } from './inbox/notifications.repository';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => PlatformModule),
    AuthorizationModule,
  ],
  controllers: [NotificationsController],
  providers: [
    LegacyNotificationsService,
    TemporaryEmailAdapter,
    { provide: NOTIFICATION_DELIVERY, useExisting: TemporaryEmailAdapter },
    NotificationsService,
    NotificationsRepository,
  ],
  exports: [LegacyNotificationsService, NotificationsService],
})
export class NotificationsModule {}
