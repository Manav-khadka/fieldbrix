import { Controller, Get } from '@nestjs/common';
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
}
