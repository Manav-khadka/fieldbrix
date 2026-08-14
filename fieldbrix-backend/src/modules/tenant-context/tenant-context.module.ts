import { Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context/tenant-context.service';

@Module({
  providers: [TenantContextService],
  exports: [TenantContextService]
})
export class TenantContextModule {}
