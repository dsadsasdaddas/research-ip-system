import { UserRole } from '../../users/entities/user.entity';

/**
 * JWT payload 验证后挂在 req.user 上的用户上下文。
 * 所有 Controller / Service 中的 CurrentUser() 必须用此类型，禁止 any。
 */
export interface AuthUser {
  id: number;
  username: string;
  realName: string | null;
  role: UserRole;
  deptId: number | null;
}
