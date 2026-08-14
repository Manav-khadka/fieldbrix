import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DependencyHealthService } from './health/dependency-health.service';

@Injectable()
export class AppService {
  constructor(
    private readonly config: ConfigService,
    private readonly dependencies: DependencyHealthService,
  ) {}

  getService() {
    return {
      service: 'fieldbrix-api',
      status: 'online',
      environment: this.config.get<string>('APP_ENV'),
    };
  }

  getLiveness() {
    return { status: 'live' };
  }

  async getReadiness() {
    const dependencies = await this.dependencies.check();
    if (Object.values(dependencies).some((status) => status !== 'ok')) {
      throw new ServiceUnavailableException(
        'Required dependencies are unavailable',
      );
    }
    return { status: 'ready', ...dependencies };
  }

  getVersion() {
    return {
      service: 'fieldbrix-api',
      version: this.config.get<string>('APP_VERSION'),
      commitSha: this.config.get<string>('APP_COMMIT_SHA'),
      buildTime: this.config.get<string>('APP_BUILD_TIME') || null,
    };
  }
}
