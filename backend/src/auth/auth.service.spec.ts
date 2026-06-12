import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { UsersService } from '../users/users.service';
import type { MockObject } from '../testing/mocks';

jest.mock('bcryptjs');
import * as bcrypt from 'bcryptjs';

function mockUsers(user: unknown): unknown {
  return { findByUsername: jest.fn().mockResolvedValue(user) };
}

function mockJwt(): JwtService {
  return { sign: jest.fn().mockReturnValue('TOKEN') } as unknown as JwtService;
}

describe('AuthService', () => {
  let usersService: MockObject;
  let jwtService: JwtService;
  let service: AuthService;

  beforeEach(() => {
    usersService = mockUsers(null) as MockObject;
    jwtService = mockJwt();
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
    );
    (bcrypt.compare as jest.Mock).mockReset();
  });

  it('用户不存在 → 401', async () => {
    usersService.findByUsername.mockResolvedValue(null);
    await expect(service.login('nope', 'p')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('用户未激活 → 401', async () => {
    usersService.findByUsername.mockResolvedValue({
      id: 1,
      username: 'u',
      password: 'h',
      isActive: false,
      realName: null,
      role: 'researcher',
      deptId: null,
    });
    await expect(service.login('u', 'p')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('密码不匹配 → 401', async () => {
    usersService.findByUsername.mockResolvedValue({
      id: 1,
      username: 'u',
      password: 'h',
      isActive: true,
      realName: null,
      role: 'researcher',
      deptId: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(service.login('u', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('凭据正确 → 返回 token + user', async () => {
    const user = {
      id: 7,
      username: 'u',
      password: 'h',
      isActive: true,
      realName: '张三',
      role: 'sys_admin',
      deptId: 3,
    };
    usersService.findByUsername.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const out = await service.login('u', 'right');
    expect(out.token).toBe('TOKEN');
    expect(out.user).toMatchObject({
      id: 7,
      username: 'u',
      role: 'sys_admin',
      deptId: 3,
    });
    expect(jwtService.sign).toHaveBeenCalled();
  });
});
