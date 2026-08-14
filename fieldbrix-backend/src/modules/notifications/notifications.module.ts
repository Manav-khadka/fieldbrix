import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications/notifications.service';
import { NOTIFICATION_DELIVERY } from './ports/notification-delivery.port/notification-delivery.port';
import { TemporaryEmailAdapter } from './adapters/temporary-email.adapter/temporary-email.adapter';

@Module({
  providers: [
    NotificationsService,
    TemporaryEmailAdapter,
    { provide: NOTIFICATION_DELIVERY, useExisting: TemporaryEmailAdapter },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
