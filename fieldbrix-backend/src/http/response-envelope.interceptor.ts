import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { CorrelatedRequest } from './correlation-id.middleware';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<CorrelatedRequest>();
    return next.handle().pipe(
      map((data: unknown) => ({
        data,
        meta: { correlationId: request.correlationId },
      })),
    );
  }
}
