import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../users/user-role.enum';
import { AuthenticatedUser } from '../types/jwt-payload.type';

function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).some((role) => role === value);
}

function isJwtPayload(
  payload: unknown,
): payload is { sub: number; email: string; role?: UserRole } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'sub' in payload &&
    Number.isInteger(payload.sub) &&
    'email' in payload &&
    typeof payload.email === 'string' &&
    (!('role' in payload) || isUserRole(payload.role))
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: unknown): AuthenticatedUser {
    if (!isJwtPayload(payload)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? UserRole.STUDENT,
    };
  }
}
