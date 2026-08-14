import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_DELIVERY } from '../ports/notification-delivery.port/notification-delivery.port';
import type { NotificationDeliveryPort } from '../ports/notification-delivery.port/notification-delivery.port';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_DELIVERY)
    private readonly delivery: NotificationDeliveryPort,
  ) {}
  sendPasswordReset(recipient: string, token: string) {
    return this.queue('password_reset', recipient, token);
  }
  sendInvitation(recipient: string, token: string) {
    return this.queue('invitation', recipient, token);
  }
  private queue(
    type: 'password_reset' | 'invitation',
    recipient: string,
    token: string,
  ) {
    return this.delivery.deliver(type, recipient, token);
  }
}
