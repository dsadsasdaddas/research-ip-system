import { escapeLike } from '../escape-like';
import { getSecretLevels } from '../secret-filter';
import { getDeptFilter, isDeptScoped } from '../dept-filter';
import { paginate } from '../pagination';
import { batchSoftDelete, batchHardDelete } from '../batch-delete';
import { mockRepository, mockQueryBuilder } from '../../../testing/mocks';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { UserRole } from '../../../users/entities/user.entity';
import type { AuthUser } from '../../../auth/types/auth-user.interface';

function mockUser(role: UserRole, deptId: number | null = null): AuthUser {
  return { id: 1, username: 'test', realName: null, role, deptId };
}

describe('escapeLike', () => {
  it('转义 % 字符', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  it('转义 _ 字符', () => {
    expect(escapeLike('test_name')).toBe('test\\_name');
  });

  it('转义 \\ 字符', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('组合转义', () => {
    expect(escapeLike('%test_value\\')).toBe('\\%test\\_value\\\\');
  });

  it('普通字符串不变', () => {
    expect(escapeLike('hello world')).toBe('hello world');
  });

  it('空字符串不变', () => {
    expect(escapeLike('')).toBe('');
  });
});

describe('getSecretLevels', () => {
  it('researcher 只能看公开', () => {
    expect(getSecretLevels(mockUser(UserRole.RESEARCHER))).toEqual(['公开']);
  });

  it('dept_secretary 只能看公开', () => {
    expect(getSecretLevels(mockUser(UserRole.DEPT_SEC))).toEqual(['公开']);
  });

  it('dept_admin 只能看公开', () => {
    expect(getSecretLevels(mockUser(UserRole.DEPT_ADMIN))).toEqual(['公开']);
  });

  it('leader 可看公开 + 内部', () => {
    expect(getSecretLevels(mockUser(UserRole.LEADER))).toEqual([
      '公开',
      '内部',
    ]);
  });

  it('auditor 可看公开 + 内部', () => {
    expect(getSecretLevels(mockUser(UserRole.AUDITOR))).toEqual([
      '公开',
      '内部',
    ]);
  });

  it('secret_admin 可看全部密级', () => {
    expect(getSecretLevels(mockUser(UserRole.SECRET_ADMIN))).toEqual([
      '公开',
      '内部',
      '涉密',
    ]);
  });

  it('sys_admin 可看全部密级', () => {
    expect(getSecretLevels(mockUser(UserRole.SYS_ADMIN))).toEqual([
      '公开',
      '内部',
      '涉密',
    ]);
  });
});

describe('getDeptFilter / isDeptScoped', () => {
  it('部门隔离角色返回 deptId', () => {
    expect(getDeptFilter(mockUser(UserRole.RESEARCHER, 5))).toBe(5);
    expect(getDeptFilter(mockUser(UserRole.DEPT_SEC, 7))).toBe(7);
    expect(getDeptFilter(mockUser(UserRole.DEPT_ADMIN, 9))).toBe(9);
  });
  it('部门隔离角色 deptId 为 null 时返回 null', () => {
    expect(getDeptFilter(mockUser(UserRole.RESEARCHER, null))).toBeNull();
  });
  it('全院角色返回 undefined(不加 where)', () => {
    expect(getDeptFilter(mockUser(UserRole.LEADER))).toBeUndefined();
    expect(getDeptFilter(mockUser(UserRole.AUDITOR))).toBeUndefined();
    expect(getDeptFilter(mockUser(UserRole.SECRET_ADMIN))).toBeUndefined();
    expect(getDeptFilter(mockUser(UserRole.SYS_ADMIN))).toBeUndefined();
  });
  it('isDeptScoped 判断', () => {
    expect(isDeptScoped(UserRole.RESEARCHER)).toBe(true);
    expect(isDeptScoped(UserRole.DEPT_SEC)).toBe(true);
    expect(isDeptScoped(UserRole.DEPT_ADMIN)).toBe(true);
    expect(isDeptScoped(UserRole.LEADER)).toBe(false);
  });
});

describe('paginate', () => {
  function makeQb(
    items: unknown[],
    total: number,
  ): SelectQueryBuilder<{ id: number }> {
    const qb = mockQueryBuilder({
      getManyAndCount: jest.fn().mockResolvedValue([items, total]),
    });
    return qb as unknown as SelectQueryBuilder<{ id: number }>;
  }
  it('默认 page=1 / pageSize=20', async () => {
    const r = await paginate(makeQb([], 0));
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.totalPages).toBe(0);
    expect(r.total).toBe(0);
  });
  it('page<=0 钳到 1', async () => {
    const r = await paginate(makeQb([], 5), 0, 10);
    expect(r.page).toBe(1);
  });
  it('pageSize<=0 钳到 1', async () => {
    const r = await paginate(makeQb([], 5), 1, 0);
    expect(r.pageSize).toBe(1);
  });
  it('pageSize>500 钳到 500', async () => {
    const r = await paginate(makeQb([], 5), 1, 9999);
    expect(r.pageSize).toBe(500);
  });
  it('totalPages 向上取整并返回 items', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    const r = await paginate(makeQb(items, 25), 2, 20);
    expect(r.items).toEqual(items);
    expect(r.total).toBe(25);
    expect(r.totalPages).toBe(2);
  });
});

describe('batchSoftDelete / batchHardDelete', () => {
  it('batchSoftDelete 空 ids 直接返回 0,不调 update', async () => {
    const repo = mockRepository();
    expect(
      await batchSoftDelete(repo as unknown as Repository<never>, []),
    ).toBe(0);
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('batchSoftDelete 返回 affected', async () => {
    const repo = mockRepository({
      update: jest.fn().mockResolvedValue({ affected: 2 }),
    });
    expect(
      await batchSoftDelete(repo as unknown as Repository<never>, [1, 2]),
    ).toBe(2);
  });
  it('batchSoftDelete affected 为空时返回 0', async () => {
    const repo = mockRepository({
      update: jest.fn().mockResolvedValue({ affected: null }),
    });
    expect(
      await batchSoftDelete(repo as unknown as Repository<never>, [1]),
    ).toBe(0);
  });
  it('batchHardDelete 空 ids 返回 0', async () => {
    const repo = mockRepository();
    expect(
      await batchHardDelete(repo as unknown as Repository<never>, []),
    ).toBe(0);
    expect(repo.delete).not.toHaveBeenCalled();
  });
  it('batchHardDelete 返回 affected,affected 空返回 0', async () => {
    const repo = mockRepository({
      delete: jest.fn().mockResolvedValue({ affected: 3 }),
    });
    expect(
      await batchHardDelete(repo as unknown as Repository<never>, [1, 2, 3]),
    ).toBe(3);
    const repo2 = mockRepository({
      delete: jest.fn().mockResolvedValue({ affected: null }),
    });
    expect(
      await batchHardDelete(repo2 as unknown as Repository<never>, [1]),
    ).toBe(0);
  });
});
