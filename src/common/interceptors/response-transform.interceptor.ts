import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import { map, Observable } from 'rxjs';
import type { Response } from 'express';
import type { ApiResponse } from '@/common/interfaces/api-response.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isApiResponseEnvelope(value: unknown): value is ApiResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.code === 'number' &&
    ('message' in value || 'data' in value || 'expextion' in value)
  );
}

function resolveMessage(data: unknown, statusCode: number): string {
  if (isRecord(data) && typeof data.message === 'string') {
    return data.message;
  }

  return STATUS_CODES[statusCode] ?? 'OK';
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown): ApiResponse => {
        if (isApiResponseEnvelope(data)) {
          return data;
        }

        const statusCode = response.statusCode;
        const payload: ApiResponse = {
          message: resolveMessage(data, statusCode),
          code: statusCode,
        };

        if (data !== undefined) {
          payload.data = data;
        }

        return payload;
      }),
    );
  }
}
