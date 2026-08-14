import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PlatformRepository } from '../../../platform/platform.repository/platform.repository';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly repository: PlatformRepository,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const supplied = request.headers['x-platform-admin-token'] ?? '';
    const environment = this.config.get<string>('NODE_ENV', 'development');
    const configured = this.config.get<string>('PLATFORM_ADMIN_TOKEN');
    if (environment === 'production' && !configured)
      throw new ForbiddenException('PLATFORM_ADMIN_NOT_CONFIGURED');
    const expected = configured ?? 'local-platform-admin';
    const left = Buffer.from(supplied);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right))
      throw new ForbiddenException('PLATFORM_ADMIN_REQUIRED');
    const adminId = request.headers['x-platform-admin-id'];
    if (
      this.config.get<string>('DATABASE_URL') ||
      this.config.get<string>('DB_HOST')
    ) {
      if (
        !adminId ||
        !/^[0-9a-f-]{36}$/i.test(adminId) ||
        !(await this.repository.isActivePlatformAdmin(adminId))
      )
        throw new ForbiddenException('PLATFORM_ADMIN_INACTIVE');
    }
    return true;
  }
}
