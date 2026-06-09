import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 与 AuthModule 签名用同一密钥来源,避免 sign/verify 不一致导致 401
      secretOrKey: config.get<string>('JWT_SECRET') || 'research-mis-secret',
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
