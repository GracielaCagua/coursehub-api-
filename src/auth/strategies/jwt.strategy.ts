import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../types/jwt-payload.type';

function isJwtPayload(
  payload: unknown,
): payload is { sub: number; email: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'sub' in payload &&
    Number.isInteger(payload.sub) &&
    'email' in payload &&
    typeof payload.email === 'string'
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

    return { id: payload.sub, email: payload.email };
  }
}
