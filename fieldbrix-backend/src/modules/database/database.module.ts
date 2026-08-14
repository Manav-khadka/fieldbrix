import { Module } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { TenantContextModule } from '../tenant-context/tenant-context.module';

@Module({
  imports: [TenantContextModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
