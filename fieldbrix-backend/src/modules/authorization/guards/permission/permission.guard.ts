import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformService } from '../../../platform/platform/platform.service';
import { PERMISSION_KEY, PERMISSION_SCOPE_KEY, PermissionScope } from '../../decorators/permission.decorator/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly platform: PlatformService) {}
  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!permission) return true;
    const requiredScope = this.reflector.getAllAndOverride<PermissionScope>(PERMISSION_SCOPE_KEY, [context.getHandler(), context.getClass()]) ?? 'all';
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    const capabilities = this.platform.capabilities(token);
    if (!capabilities.grants.includes(permission) || !capabilities.scopes[permission]?.includes(requiredScope)) throw new ForbiddenException('FORBIDDEN');
    return true;
  }
}
