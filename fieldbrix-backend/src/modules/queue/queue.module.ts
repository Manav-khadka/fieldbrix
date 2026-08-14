import { Module } from '@nestjs/common';
import { QueueService } from './queue/queue.service';
import { DatabaseModule } from '../database/database.module';
import { TenantContextModule } from '../tenant-context/tenant-context.module';

@Module({
  imports: [DatabaseModule, TenantContextModule],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}
