import {
  CurrentUser,
  currentUserFactory,
  extractCurrentUser,
} from './current-user.decorator';
import { mockExecutionContext } from '../../testing/mocks';

describe('CurrentUser', () => {
  const user = {
    id: 5,
    username: 'u',
    realName: null,
    role: 'sys_admin',
    deptId: null,
  };

  it('extractCurrentUser 从 request.user 提取当前用户', () => {
    const ctx = mockExecutionContext({ request: { user } });
    expect(extractCurrentUser(ctx)).toEqual(user);
  });

  it('currentUserFactory 走装饰器回调分支', () => {
    const ctx = mockExecutionContext({ request: { user } });
    expect(currentUserFactory(null, ctx)).toEqual(user);
  });

  it('CurrentUser 是可用的参数装饰器', () => {
    expect(typeof CurrentUser).toBe('function');
  });
});
