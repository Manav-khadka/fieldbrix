import { Module } from '@nestjs/common';
import { AuthorizationController } from './authorization/authorization.controller';
import { AuthorizationService } from './authorization/authorization.service';
import { PlatformModule } from '../platform/platform.module';
import { PermissionGuard } from './guards/permission/permission.guard';
import { PlatformAdminGuard } from './guards/platform-admin/platform-admin.guard';
import { IdempotencyModule } from '../idempotency/idempotency.module';

@Module({
  controllers: [AuthorizationController],
  imports: [PlatformModule, IdempotencyModule],
  providers: [AuthorizationService, PermissionGuard, PlatformAdminGuard],
  exports: [PermissionGuard, PlatformAdminGuard]
})
export class AuthorizationModule {}
