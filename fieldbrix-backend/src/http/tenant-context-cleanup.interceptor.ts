import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
import { TenantContextService } from '../modules/tenant-context/tenant-context/tenant-context.service';

@Injectable()
export class TenantContextCleanupInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(finalize(() => this.tenantContext.clear()));
  }
}
