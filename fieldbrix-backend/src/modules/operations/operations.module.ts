import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { OperationsRepository } from './operations.repository';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PlatformModule } from '../platform/platform.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';

@Module({
  controllers: [OperationsController],
  imports: [DatabaseModule, AuthorizationModule, PlatformModule, IdempotencyModule],
  providers: [OperationsService, OperationsRepository],
  exports: [OperationsService],
})
export class OperationsModule {}
