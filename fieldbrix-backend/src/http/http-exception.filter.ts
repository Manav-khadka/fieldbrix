import {
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import type { Response } from 'express';
import type { CorrelatedRequest } from './correlation-id.middleware';

@Catch()
export class HttpExceptionEnvelopeFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<CorrelatedRequest>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException
      ? exception.message
      : 'Internal server error';

    response.status(status).json({
      error: {
        code: status === 503 ? 'DEPENDENCY_UNAVAILABLE' : 'REQUEST_FAILED',
        message,
      },
      meta: { correlationId: request.correlationId },
    });
  }
}
