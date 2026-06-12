import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { mockExecutionContext } from '../../testing/mocks';

function guardWith(required: unknown): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('无角色要求(undefined) → 放行', () => {
    expect(
      guardWith(undefined).canActivate(
        mockExecutionContext({ request: { user: { role: 'x' } } }),
      ),
    ).toBe(true);
  });

  it('角色为空数组 → 放行', () => {
    expect(
      guardWith([]).canActivate(
        mockExecutionContext({ request: { user: { role: 'x' } } }),
      ),
    ).toBe(true);
  });

  it('用户角色命中 → 放行', () => {
    expect(
      guardWith(['sys_admin', 'leader']).canActivate(
        mockExecutionContext({ request: { user: { role: 'sys_admin' } } }),
      ),
    ).toBe(true);
  });

  it('用户角色未命中 → 拒绝', () => {
    expect(
      guardWith(['sys_admin']).canActivate(
        mockExecutionContext({ request: { user: { role: 'researcher' } } }),
      ),
    ).toBe(false);
  });

  it('无 user → 拒绝', () => {
    expect(
      guardWith(['sys_admin']).canActivate(
        mockExecutionContext({ request: {} }),
      ),
    ).toBe(false);
  });
});
