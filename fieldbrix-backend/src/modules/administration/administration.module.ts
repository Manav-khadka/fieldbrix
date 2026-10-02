import { Module } from '@nestjs/common';
import { AdministrationController } from './administration/administration.controller';
import { AdministrationService } from './administration/administration.service';
import { PlatformModule } from '../platform/platform.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { DatabaseModule } from '../database/database.module';
import { WorkforceController } from './workforce/workforce.controller';
import { WorkforceService } from './workforce/workforce.service';

@Module({
  controllers: [AdministrationController, WorkforceController],
  imports: [
    PlatformModule,
    AuthorizationModule,
    IdempotencyModule,
    DatabaseModule,
  ],
  providers: [AdministrationService, WorkforceService],
})
export class AdministrationModule {}
