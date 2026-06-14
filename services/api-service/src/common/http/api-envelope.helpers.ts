import { randomUUID } from 'node:crypto';
import { HttpStatus, type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import {
  type ApiEnvelopeMeta,
  type ApiErrorDetail,
  type ApiPaginationMeta,
} from './api-envelope.types';
import { RAW_RESPONSE_METADATA } from './raw-response.decorator';

export type HttpRequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
  path?: string;
  url?: string;
};

export type HttpResponseLike = {
  headersSent?: boolean;
  setHeader?: (name: string, value: string) => void;
  statusCode?: number;
};

export type PaginatedPayload<T = unknown> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function isRawResponseContext(
  reflector: Reflector,
  context: ExecutionContext,
  request: HttpRequestLike,
): boolean {
  const markedRaw = reflector.getAllAndOverride<boolean>(RAW_RESPONSE_METADATA, [
    context.getHandler(),
    context.getClass(),
  ]);

  return markedRaw === true || isRawResponsePath(request);
}

export function isRawResponsePath(request: HttpRequestLike): boolean {
  const path = getRequestPath(request);
  return (
    path === '/health' ||
    path === '/api/health' ||
    path === '/api/billing/webhooks/stripe'
  );
}

export function getRequestPath(request: HttpRequestLike): string {
  const path = request.path ?? request.originalUrl ?? request.url ?? '';
  return path.split('?')[0] ?? '';
}

export function ensureRequestId(
  request: HttpRequestLike,
  response: HttpResponseLike,
): string {
  const existingRequestId = getHeaderValue(request.headers?.['x-request-id']);
  const requestId = existingRequestId?.trim() || randomUUID();

  if (!response.headersSent) {
    response.setHeader?.('x-request-id', requestId);
  }

  return requestId;
}

export function createMeta(
  request: HttpRequestLike,
  requestId: string,
): ApiEnvelopeMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    version: 'v1',
    path: getRequestPath(request),
    method: request.method ?? 'GET',
  };
}

export function successCodeForStatus(statusCode: number): string {
  if (statusCode === 201) {
    return 'RESOURCE_CREATED';
  }

  return 'REQUEST_SUCCESS';
}

export function successMessageForStatus(statusCode: number): string {
  if (statusCode === 201) {
    return 'Resource created';
  }

  return 'Request successful';
}

export function errorCodeForStatus(statusCode: number): string {
  return HttpStatus[statusCode] ?? 'INTERNAL_SERVER_ERROR';
}

export function isPaginatedPayload(value: unknown): value is PaginatedPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    typeof value.total === 'number' &&
    typeof value.page === 'number' &&
    typeof value.pageSize === 'number'
  );
}

export function toPaginationMeta(payload: PaginatedPayload): ApiPaginationMeta {
  const totalPages =
    payload.pageSize > 0 ? Math.ceil(payload.total / payload.pageSize) : 0;

  return {
    page: payload.page,
    pageSize: payload.pageSize,
    totalItems: payload.total,
    totalPages,
    hasNext: payload.page < totalPages,
    hasPrev: payload.page > 1,
  };
}

export function normalizeErrorDetails(
  errors: unknown,
  fallbackCode: string,
): ApiErrorDetail[] | undefined {
  if (!Array.isArray(errors)) {
    return undefined;
  }

  return errors.map((error) => {
    if (isRecord(error)) {
      const field = typeof error.field === 'string' ? error.field : undefined;
      const message =
        typeof error.message === 'string' ? error.message : 'Request failed';
      const code =
        typeof error.code === 'string'
          ? error.code
          : field
            ? 'VALIDATION_ERROR'
            : fallbackCode;

      return field ? { field, code, message } : { code, message };
    }

    return {
      code: fallbackCode,
      message: String(error),
    };
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
