import { Controller, Get, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getService() {
    return this.appService.getService();
  }

  @Get('health/live')
  getLiveness() {
    return this.appService.getLiveness();
  }

  @Get('health/ready')
  getReadiness() {
    return this.appService.getReadiness();
  }

  @Get('version')
  getVersion() {
    return this.appService.getVersion();
  }

  @Get('openapi.json')
  getOpenApi() {
    return this.appService.getOpenApi();
  }

  // Deliberately unavailable unless a local verification session opts in.
  // It is never enabled in production.
  @Get('debug-sentry')
  triggerSentryVerification() {
    if (
      process.env.NODE_ENV !== 'development' ||
      process.env.SENTRY_DEBUG_ENDPOINT !== 'true' ||
      process.env.APP_ENV === 'production'
    ) {
      throw new NotFoundException();
    }

    throw new Error('FieldBrix Sentry verification event');
  }
}
