import { escapeLike } from '../escape-like';
import { getSecretLevels } from '../secret-filter';
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
    expect(getSecretLevels(mockUser(UserRole.LEADER))).toEqual(['公开', '内部']);
  });

  it('auditor 可看公开 + 内部', () => {
    expect(getSecretLevels(mockUser(UserRole.AUDITOR))).toEqual(['公开', '内部']);
  });

  it('secret_admin 可看全部密级', () => {
    expect(getSecretLevels(mockUser(UserRole.SECRET_ADMIN))).toEqual(['公开', '内部', '涉密']);
  });

  it('sys_admin 可看全部密级', () => {
    expect(getSecretLevels(mockUser(UserRole.SYS_ADMIN))).toEqual(['公开', '内部', '涉密']);
  });
});
