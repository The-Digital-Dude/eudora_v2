import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import {
  createMeta,
  ensureRequestId,
  type HttpRequestLike,
  type HttpResponseLike,
  isPaginatedPayload,
  isRawResponseContext,
  successCodeForStatus,
  successMessageForStatus,
  toPaginationMeta,
} from './api-envelope.helpers';
import { type ApiSuccessEnvelope } from './api-envelope.types';

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<HttpRequestLike>();
    const response = httpContext.getResponse<HttpResponseLike>();

    if (isRawResponseContext(this.reflector, context, request)) {
      return next.handle();
    }

    const requestId = ensureRequestId(request, response);

    return next.handle().pipe(
      map((payload: unknown) => {
        const statusCode = response.statusCode ?? 200;

        if (statusCode === 204) {
          return payload;
        }

        const meta = createMeta(request, requestId);

        if (isPaginatedPayload(payload)) {
          return {
            success: true,
            code: successCodeForStatus(statusCode),
            message: successMessageForStatus(statusCode),
            data: payload.items,
            meta: {
              ...meta,
              pagination: toPaginationMeta(payload),
            },
          } satisfies ApiSuccessEnvelope<unknown[]>;
        }

        return {
          success: true,
          code: successCodeForStatus(statusCode),
          message: successMessageForStatus(statusCode),
          data: payload ?? null,
          meta,
        } satisfies ApiSuccessEnvelope<unknown>;
      }),
    );
  }
}
