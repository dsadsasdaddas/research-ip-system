import { UserRole } from '../../users/entities/user.entity';
import type { AuthUser } from '../../auth/types/auth-user.interface';

/** 可查看涉密数据的角色 */
const SECRET_VISIBLE_ROLES: UserRole[] = [
  UserRole.SECRET_ADMIN,
  UserRole.SYS_ADMIN,
];

/** 可查看内部数据的角色（包含可看涉密的角色） */
const INTERNAL_VISIBLE_ROLES: UserRole[] = [
  ...SECRET_VISIBLE_ROLES,
  UserRole.LEADER,
  UserRole.AUDITOR,
];

/**
 * 根据当前用户角色返回允许查看的密级列表。
 * - sys_admin / secret_admin → 全部密级（公开 + 内部 + 涉密）
 * - leader / auditor → 公开 + 内部
 * - dept_admin / dept_secretary / researcher → 仅公开
 */
export function getSecretLevels(user: AuthUser): string[] {
  if (SECRET_VISIBLE_ROLES.includes(user.role)) {
    return ['公开', '内部', '涉密'];
  }
  if (INTERNAL_VISIBLE_ROLES.includes(user.role)) {
    return ['公开', '内部'];
  }
  return ['公开'];
}
