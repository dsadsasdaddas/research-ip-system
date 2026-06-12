import type { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserRole } from '../users/entities/user.entity';

function makeConfig(secret: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
}

describe('JwtStrategy', () => {
  it('用 JWT_SECRET 配置', () => {
    const config = makeConfig('my-secret');
    new JwtStrategy(config);
    expect(config.get).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('无 JWT_SECRET 时回退默认值', () => {
    const config = makeConfig(undefined);
    expect(() => new JwtStrategy(config)).not.toThrow();
  });

  it('validate 把 payload 映射为 AuthUser', () => {
    const s = new JwtStrategy(makeConfig('x'));
    expect(
      s.validate({
        sub: 7,
        username: 'u',
        realName: '张三',
        role: UserRole.SYS_ADMIN,
        deptId: 3,
      }),
    ).toEqual({
      id: 7,
      username: 'u',
      realName: '张三',
      role: UserRole.SYS_ADMIN,
      deptId: 3,
    });
  });

  it('validate realName/deptId 缺省为 null', () => {
    const s = new JwtStrategy(makeConfig('x'));
    expect(
      s.validate({
        sub: 1,
        username: 'u',
        realName: undefined,
        role: UserRole.RESEARCHER,
        deptId: undefined,
      } as never),
    ).toEqual({
      id: 1,
      username: 'u',
      realName: null,
      role: UserRole.RESEARCHER,
      deptId: null,
    });
  });
});
