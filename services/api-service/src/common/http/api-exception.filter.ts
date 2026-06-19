import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import {
  createMeta,
  ensureRequestId,
  errorCodeForStatus,
  type HttpRequestLike,
  isRawResponsePath,
  isRecord,
  normalizeErrorDetails,
} from './api-envelope.helpers';
import { type ApiErrorEnvelope } from './api-envelope.types';

type JsonResponseLike = {
  headersSent?: boolean;
  setHeader?: (name: string, value: string) => void;
  statusCode?: number;
  json: (body: unknown) => void;
  status: (statusCode: number) => JsonResponseLike;
};

@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<HttpRequestLike>();
    const response = httpContext.getResponse<JsonResponseLike>();
    const statusCode = getStatusCode(exception);

    if (isRawResponsePath(request)) {
      response.status(statusCode).json(getRawErrorBody(exception, statusCode));
      return;
    }

    const requestId = ensureRequestId(request, response);
    const fallbackCode = errorCodeForStatus(statusCode);
    const normalized = normalizeException(exception, fallbackCode);
    const body: ApiErrorEnvelope = {
      success: false,
      code: normalized.code,
      message: normalized.message,
      ...(normalized.errors ? { errors: normalized.errors } : {}),
      meta: createMeta(request, requestId),
    };

    response.status(statusCode).json(body);
  }
}

function getStatusCode(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  if (isPrismaKnownRequestError(exception)) {
    return prismaStatusCode(exception.code);
  }

  if (isPrismaValidationError(exception)) {
    return HttpStatus.BAD_REQUEST;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function getRawErrorBody(exception: unknown, statusCode: number): unknown {
  if (exception instanceof HttpException) {
    return exception.getResponse();
  }

  return {
    statusCode,
    message: 'Internal server error',
  };
}

function normalizeException(
  exception: unknown,
  fallbackCode: string,
): {
  code: string;
  message: string;
  errors?: ApiErrorEnvelope['errors'];
} {
  if (!(exception instanceof HttpException)) {
    if (isPrismaKnownRequestError(exception)) {
      return normalizePrismaKnownRequestError(exception, fallbackCode);
    }

    if (isPrismaValidationError(exception)) {
      return {
        code: fallbackCode,
        message: 'Invalid database query input',
      };
    }

    return {
      code: fallbackCode,
      message: 'Internal server error',
    };
  }

  const response = exception.getResponse();

  if (typeof response === 'string') {
    return {
      code: fallbackCode,
      message: response,
    };
  }

  if (!isRecord(response)) {
    return {
      code: fallbackCode,
      message: exception.message || 'Request failed',
    };
  }

  const code = typeof response.code === 'string' ? response.code : fallbackCode;
  const rawMessage = response.message;
  const errors =
    normalizeErrorDetails(response.errors, code) ??
    (Array.isArray(rawMessage)
      ? rawMessage.map((message) => ({
          code,
          message: String(message),
        }))
      : undefined);
  const message = Array.isArray(rawMessage)
    ? typeof response.error === 'string'
      ? response.error
      : 'Validation failed'
    : typeof rawMessage === 'string'
      ? rawMessage
      : exception.message || 'Request failed';

  return errors ? { code, message, errors } : { code, message };
}

type PrismaKnownRequestErrorLike = {
  code: string;
  meta?: Record<string, unknown>;
  clientVersion?: string;
  name?: string;
};

function isPrismaKnownRequestError(
  exception: unknown,
): exception is PrismaKnownRequestErrorLike {
  return (
    isRecord(exception) &&
    typeof exception.code === 'string' &&
    /^P\d{4}$/.test(exception.code) &&
    (typeof exception.clientVersion === 'string' ||
      exception.name === 'PrismaClientKnownRequestError')
  );
}

function isPrismaValidationError(exception: unknown): boolean {
  return (
    isRecord(exception) && exception.name === 'PrismaClientValidationError'
  );
}

function prismaStatusCode(code: string): number {
  switch (code) {
    case 'P2002':
      return HttpStatus.CONFLICT;
    case 'P2025':
      return HttpStatus.NOT_FOUND;
    case 'P2003':
    case 'P2014':
      return HttpStatus.BAD_REQUEST;
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

function normalizePrismaKnownRequestError(
  exception: PrismaKnownRequestErrorLike,
  fallbackCode: string,
): {
  code: string;
  message: string;
  errors?: ApiErrorEnvelope['errors'];
} {
  switch (exception.code) {
    case 'P2002': {
      const fields = normalizePrismaTarget(exception.meta?.target);
      return {
        code: fallbackCode,
        message:
          fields.length > 0
            ? `A record with this ${fields.join(', ')} already exists`
            : 'Record already exists',
        ...(fields.length > 0
          ? {
              errors: fields.map((field) => ({
                code: fallbackCode,
                field,
                message: `${field} must be unique`,
              })),
            }
          : {}),
      };
    }
    case 'P2025':
      return {
        code: fallbackCode,
        message: 'Record not found',
      };
    case 'P2003':
      return {
        code: fallbackCode,
        message: 'Referenced record does not exist',
      };
    case 'P2014':
      return {
        code: fallbackCode,
        message: 'The requested change violates a required relationship',
      };
    default:
      return {
        code: fallbackCode,
        message: 'Database request failed',
      };
  }
}

function normalizePrismaTarget(target: unknown): string[] {
  if (Array.isArray(target)) {
    return target.map((value) => String(value));
  }

  if (typeof target === 'string') {
    return [target];
  }

  return [];
}
