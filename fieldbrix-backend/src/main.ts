import './instrument';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('bootstrap');
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.ADMIN_ORIGIN
      ? [process.env.ADMIN_ORIGIN]
      : ['http://localhost:5173'],
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
