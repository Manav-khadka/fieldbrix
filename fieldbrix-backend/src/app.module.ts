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

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DependencyHealthService,
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionEnvelopeFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
