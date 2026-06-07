import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from './types/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

interface JwtPayload {
  sub: number;
  username: string;
  realName: string | null;
  role: UserRole;
  deptId: number | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'research-mis-secret',
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      username: payload.username,
      realName: payload.realName ?? null,
      role: payload.role,
      deptId: payload.deptId ?? null,
    };
  }
}
