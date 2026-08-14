import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PlatformModule } from '../platform/platform.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';

@Module({
  controllers: [AuthController],
  imports: [PlatformModule, IdempotencyModule],
  providers: [AuthService],
})
export class AuthModule {}
