import { Roles, ROLES_KEY } from './roles.decorator';

describe('Roles 装饰器', () => {
  it('ROLES_KEY 常量为 "roles"', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('Roles(...) 返回装饰器函数并可应用(写入元数据,不抛错)', () => {
    const dec = Roles('a', 'b');
    expect(typeof dec).toBe('function');
    class Target {
      method(): void {}
    }
    const desc = Object.getOwnPropertyDescriptor(Target.prototype, 'method');
    expect(() => dec(Target.prototype, 'method', desc)).not.toThrow();
  });
});
