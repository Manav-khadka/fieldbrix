import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { rowToCamelCase } from '../../master-data/support/case';

export type NotificationRecord = {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  readAt?: string;
  dismissedAt?: string;
  createdAt: string;
};

@Injectable()
export class NotificationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async listForUser(
    userId: string,
    limit = 50,
  ): Promise<{ items: NotificationRecord[]; unreadCount: number }> {
    const [items, countResult] = await Promise.all([
      this.database.tenantQuery<Record<string, unknown>>(
        `SELECT n.*, n.id::text AS id, n.recipient_user_id::text AS "recipientUserId"
         FROM notifications n
         WHERE n.recipient_user_id = $1::uuid AND n.dismissed_at IS NULL
         ORDER BY n.created_at DESC
         LIMIT $2`,
        [userId, limit],
      ),
      this.database.tenantQuery<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM notifications
         WHERE recipient_user_id = $1::uuid AND read_at IS NULL AND dismissed_at IS NULL`,
        [userId],
      ),
    ]);

    return {
      items: items.map((r) => rowToCamelCase<NotificationRecord>(r)),
      unreadCount: Number(countResult[0]?.count ?? 0),
    };
  }

  async create(payload: {
    recipientUserId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<NotificationRecord> {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `INSERT INTO notifications (tenant_id, recipient_user_id, type, title, message, entity_type, entity_id)
       VALUES (current_setting('app.tenant_id', true)::uuid, $1::uuid, $2, $3, $4, $5, $6)
       RETURNING *, id::text AS id`,
      [
        payload.recipientUserId,
        payload.type,
        payload.title,
        payload.message,
        payload.entityType ?? null,
        payload.entityId ?? null,
      ],
    );
    return rowToCamelCase<NotificationRecord>(result[0]);
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.database.tenantQuery(
      `UPDATE notifications
       SET read_at = clock_timestamp()
       WHERE id = $1::uuid AND recipient_user_id = $2::uuid AND read_at IS NULL`,
      [id, userId],
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.database.tenantQuery(
      `UPDATE notifications
       SET read_at = clock_timestamp()
       WHERE recipient_user_id = $1::uuid AND read_at IS NULL`,
      [userId],
    );
  }

  async dismiss(id: string, userId: string): Promise<void> {
    await this.database.tenantQuery(
      `UPDATE notifications
       SET dismissed_at = clock_timestamp()
       WHERE id = $1::uuid AND recipient_user_id = $2::uuid`,
      [id, userId],
    );
  }
}
