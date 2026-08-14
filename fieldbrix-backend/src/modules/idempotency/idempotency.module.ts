import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency/idempotency.service';
import { DatabaseModule } from '../database/database.module';
import { TenantContextModule } from '../tenant-context/tenant-context.module';

@Module({
  imports: [DatabaseModule, TenantContextModule],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
