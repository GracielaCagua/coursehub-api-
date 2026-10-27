import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

type AuthenticatedRequest = Request & { user: JwtPayload };

const INVALID_TOKEN_ERROR_NAMES = new Set([
  'JsonWebTokenError',
  'NotBeforeError',
  'TokenExpiredError',
]);

function hasJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== 'object' || value === null) return false;

  const payload = value as Record<string, unknown>;
  return Number.isInteger(payload.sub) && typeof payload.email === 'string';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token, ...extraParts] = authorization?.trim().split(/\s+/) ?? [];

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token ||
      extraParts.length > 0
    ) {
      throw new UnauthorizedException('Bearer token required');
    }

    let payload: unknown;
    try {
      payload = await this.jwtService.verifyAsync<object>(token);
    } catch (error) {
      if (
        error instanceof Error &&
        INVALID_TOKEN_ERROR_NAMES.has(error.name)
      ) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
    }

    if (!hasJwtPayload(payload)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    request.user = payload;
    return true;
  }
}
