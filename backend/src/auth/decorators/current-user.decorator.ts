import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.interface';

/**
 * 从 ExecutionContext 提取当前用户(挂在 req.user 上)。
 * 单独导出便于单测直接调用,createParamDecorator 返回的是装饰器不能直接 invoke。
 */
export function extractCurrentUser(ctx: ExecutionContext): AuthUser {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
}

/** 参数装饰器回调(导出便于直接单测覆盖该分支) */
export const currentUserFactory = (
  _: unknown,
  ctx: ExecutionContext,
): AuthUser => extractCurrentUser(ctx);

/**
 * 从 JWT 验证结果中提取当前用户，类型安全版本。
 * 用法：@CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(currentUserFactory);
