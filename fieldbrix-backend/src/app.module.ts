import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnvironment } from './config/environment';
import { DependencyHealthService } from './health/dependency-health.service';
import { CorrelationIdMiddleware } from './http/correlation-id.middleware';
import { HttpExceptionEnvelopeFilter } from './http/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './http/response-envelope.interceptor';
import { TenantContextCleanupInterceptor } from './http/tenant-context-cleanup.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AdministrationModule } from './modules/administration/administration.module';
import { PlatformModule } from './modules/platform/platform.module';
import { DatabaseModule } from './modules/database/database.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { StorageModule } from './modules/storage/storage.module';
import { QueueModule } from './modules/queue/queue.module';
import { TenantContextModule } from './modules/tenant-context/tenant-context.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PdfWorkerModule } from './workers/pdf-worker/pdf-worker.module';
import { OperationsModule } from './modules/operations/operations.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AuthModule,
    AuthorizationModule,
    AdministrationModule,
    PlatformModule,
    DatabaseModule,
    IdempotencyModule,
    StorageModule,
    QueueModule,
    TenantContextModule,
    NotificationsModule,
    PdfWorkerModule,
    OperationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DependencyHealthService,
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantContextCleanupInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionEnvelopeFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
