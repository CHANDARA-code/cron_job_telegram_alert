import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export const API_KEY_HEADER = 'x-api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedApiKey = process.env.ADMIN_API_KEY?.trim();
    const providedApiKey = request.header(API_KEY_HEADER);

    if (!expectedApiKey) {
      throw new UnauthorizedException('ADMIN_API_KEY is not configured.');
    }

    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      throw new UnauthorizedException(`Missing or invalid ${API_KEY_HEADER}.`);
    }

    return true;
  }
}
