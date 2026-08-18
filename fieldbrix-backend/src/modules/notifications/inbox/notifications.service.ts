import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  listForUser(userId: string) {
    return this.repository.listForUser(userId);
  }

  create(dto: CreateNotificationDto) {
    return this.repository.create(dto);
  }

  markRead(id: string, userId: string) {
    return this.repository.markRead(id, userId);
  }

  markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }

  dismiss(id: string, userId: string) {
    return this.repository.dismiss(id, userId);
  }
}
