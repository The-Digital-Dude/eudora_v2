import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<HttpRequestLike>();
    const response = httpContext.getResponse<JsonResponseLike>();
    const statusCode = getStatusCode(exception);

    // Stripe failures are otherwise invisible: the client sees a bare 500 and
    // nothing reaches the logs. Always record the underlying reason.
    if (isStripeError(exception)) {
      this.logger.error(
        `Stripe ${exception.type ?? 'error'} on ${request?.method ?? '?'} ` +
          `${request?.url ?? '?'}: ${exception.message}`,
      );
    }

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

  if (isStripeError(exception)) {
    return stripeStatusCode(exception.type);
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

    if (isStripeError(exception)) {
      return normalizeStripeError(exception, fallbackCode);
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

type StripeErrorLike = {
  type: string;
  message: string;
  code?: string;
  statusCode?: number;
};

/** Stripe SDK errors all carry a `type` of the form `Stripe*Error`. */
function isStripeError(exception: unknown): exception is StripeErrorLike {
  return (
    isRecord(exception) &&
    typeof exception.type === 'string' &&
    /^Stripe[A-Za-z]*Error$/.test(exception.type) &&
    typeof exception.message === 'string'
  );
}

function stripeStatusCode(type: string): number {
  switch (type) {
    case 'StripeCardError':
      // The card was declined — the caller can act on this.
      return HttpStatus.PAYMENT_REQUIRED;
    case 'StripeInvalidRequestError':
      return HttpStatus.BAD_REQUEST;
    case 'StripeRateLimitError':
      return HttpStatus.TOO_MANY_REQUESTS;
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
      // Our credentials are wrong — a server misconfiguration, not the
      // caller's fault, so this must not be reported as a 4xx.
      return HttpStatus.SERVICE_UNAVAILABLE;
    default:
      return HttpStatus.BAD_GATEWAY;
  }
}

function normalizeStripeError(
  exception: StripeErrorLike,
  fallbackCode: string,
): {
  code: string;
  message: string;
} {
  switch (exception.type) {
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
      // Never echo the key material back to the client; the real reason is
      // logged server-side.
      return {
        code: fallbackCode,
        message:
          'Payment provider is not configured correctly. Please contact support.',
      };
    case 'StripeCardError':
    case 'StripeInvalidRequestError':
      // Safe and actionable, e.g. "No such price: price_x" or a card decline.
      return { code: fallbackCode, message: exception.message };
    default:
      return {
        code: fallbackCode,
        message: 'Payment provider request failed. Please try again.',
      };
  }
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
