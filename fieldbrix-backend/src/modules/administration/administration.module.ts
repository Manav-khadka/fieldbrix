import { Module } from '@nestjs/common';
import { AdministrationController } from './administration/administration.controller';
import { AdministrationService } from './administration/administration.service';
import { PlatformModule } from '../platform/platform.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';

@Module({
  controllers: [AdministrationController],
  imports: [PlatformModule, AuthorizationModule, IdempotencyModule],
  providers: [AdministrationService]
})
export class AdministrationModule {}
