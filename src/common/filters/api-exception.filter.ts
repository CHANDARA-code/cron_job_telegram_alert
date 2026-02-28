import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiResponse } from '@/common/interfaces/api-response.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function extractMessageFromExceptionResponse(
  value: unknown,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const message = value.message;
  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof value.error === 'string') {
    return value.error;
  }

  return undefined;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let expextion: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        extractMessageFromExceptionResponse(exceptionResponse) ??
        exception.message ??
        message;
      expextion = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message || message;
      expextion = {
        name: exception.name,
        message: exception.message,
      };
    } else {
      expextion = String(exception);
    }

    const payload: ApiResponse<never> = {
      message,
      code: statusCode,
      expextion,
    };

    response.status(statusCode).json(payload);
  }
}
