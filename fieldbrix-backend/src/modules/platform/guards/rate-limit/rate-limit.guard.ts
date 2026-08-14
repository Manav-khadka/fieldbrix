import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string; route?: { path?: string }; body?: { identifier?: string } }>();
    const route = request.route?.path ?? 'unknown';
    const identifier = request.body?.identifier?.trim().toLowerCase();
    const ipKey = `ip:${request.ip ?? 'unknown'}:${route}`;
    this.consume(ipKey, 60);
    if (identifier) this.consume(`account:${route}:${identifier}`, 10);
    return true;
  }
  private consume(key: string, limit: number) {
    const now = Date.now();
    const window = this.windows.get(key) ?? { startedAt: now, count: 0 };
    if (now - window.startedAt >= 60_000) { window.startedAt = now; window.count = 0; }
    window.count += 1;
    this.windows.set(key, window);
    if (window.count > limit) throw new HttpException('RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
  }
}
