import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) throw new UnauthorizedException('用户名或密码错误');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('用户名或密码错误');

    const payload = { sub: user.id, username: user.username, realName: user.realName, role: user.role, deptId: user.deptId };
    return {
      token: this.jwtService.sign(payload),
      user: { id: user.id, username: user.username, realName: user.realName, role: user.role, deptId: user.deptId },
    };
  }
}
