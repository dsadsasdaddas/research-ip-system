import { UserRole } from '../../users/entities/user.entity';
import type { AuthUser } from '../../auth/types/auth-user.interface';

/** 这些角色只能查看本部门数据 */
const DEPT_SCOPED_ROLES: UserRole[] = [
  UserRole.RESEARCHER,
  UserRole.DEPT_SEC,
  UserRole.DEPT_ADMIN,
];

/** 判断该角色是否受部门隔离限制 */
export function isDeptScoped(role: UserRole): boolean {
  return DEPT_SCOPED_ROLES.includes(role);
}

/**
 * 根据当前用户返回部门过滤值。
 * - 部门隔离角色返回 user.deptId（可能为 null）
 * - 全院角色返回 undefined（不加 where 条件）
 */
export function getDeptFilter(user: AuthUser): number | null | undefined {
  return isDeptScoped(user.role) ? user.deptId : undefined;
}
