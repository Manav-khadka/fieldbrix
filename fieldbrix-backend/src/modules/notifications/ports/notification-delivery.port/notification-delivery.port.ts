export type NotificationKind = 'password_reset' | 'invitation';

export interface NotificationDeliveryPort {
  deliver(kind: NotificationKind, recipient: string, secret: string): { deliveryId: string; accepted: boolean };
}

export const NOTIFICATION_DELIVERY = Symbol('NOTIFICATION_DELIVERY');
