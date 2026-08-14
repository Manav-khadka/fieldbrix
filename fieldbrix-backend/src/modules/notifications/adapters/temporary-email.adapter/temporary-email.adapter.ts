import { createHash, randomUUID } from 'node:crypto';
import {
  NotificationDeliveryPort,
  NotificationKind,
} from '../../ports/notification-delivery.port/notification-delivery.port';

export class TemporaryEmailAdapter implements NotificationDeliveryPort {
  private readonly deliveries = new Map<
    string,
    {
      kind: NotificationKind;
      recipientHash: string;
      secretHash: string;
      createdAt: string;
    }
  >();

  deliver(kind: NotificationKind, recipient: string, secret: string) {
    const deliveryId = randomUUID();
    this.deliveries.set(deliveryId, {
      kind,
      recipientHash: createHash('sha256').update(recipient).digest('hex'),
      secretHash: createHash('sha256').update(secret).digest('hex'),
      createdAt: new Date().toISOString(),
    });
    return { deliveryId, accepted: true };
  }
}
