import './instrument';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
    }),
  );
  const logger = new Logger('bootstrap');
  app.enableShutdownHooks();
  const allowedOrigins = new Set([
    'https://admin.fieldbrix.com',
    'https://api.fieldbrix.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ]);

  if (process.env.ADMIN_ORIGIN) {
    for (const origin of process.env.ADMIN_ORIGIN.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) allowedOrigins.add(trimmed);
    }
  }

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        allowedOrigins.has(origin) ||
        origin.endsWith('.fieldbrix.com') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-correlation-id',
      'x-platform-admin-token',
      'x-platform-admin-id',
      'x-platform-admin-reauth',
      'x-tenant-id',
      'idempotency-key',
    ],
  });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(
    JSON.stringify({
      event: 'application.started',
      environment: process.env.APP_ENV ?? 'local',
      version: process.env.APP_VERSION ?? '0.0.1',
      port,
    }),
  );
}
void bootstrap();
