import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, ACCOUNTS, auth, login } from './helpers';

jest.setTimeout(30000);

/**
 * 认证接口 e2e:POST /api/auth/login
 * 覆盖:正常登录(各角色)、密码错误、用户不存在、缺字段、token 的有效性与防伪。
 */
describe('Auth (e2e) — POST /api/auth/login', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('管理员正确密码 → 201 且返回 token + 用户信息(不含密码)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'sys_admin' });
    expect(res.body.user).not.toHaveProperty('password'); // 绝不泄露密码哈希
  });

  it.each(Object.values(ACCOUNTS))(
    '账号 $username 能正常登录并拿到 token(角色 $role)',
    async ({ username, password, role }) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe(role);
    },
  );

  it('密码错误 → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('用户不存在 → 401(且不暴露"用户是否存在")', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'no_such_user', password: 'whatever' });
    expect(res.status).toBe(401);
    // 与密码错误返回同样的文案,避免用户名枚举
    expect(res.body.message).toBe('用户名或密码错误');
  });

  it('登录拿到的 token 能访问受保护接口 → 200', async () => {
    const token = await login(app, 'admin', 'Admin@123');
    const res = await request(app.getHttpServer())
      .get('/api/papers')
      .set(auth(token));
    expect(res.status).toBe(200);
  });

  it('伪造/篡改的 token → 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/papers')
      .set(auth('eyJhbGciOiJIUzI1NiJ9.fake.signature'));
    expect(res.status).toBe(401);
  });

  it('Authorization 头格式错误(非 Bearer)→ 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/papers')
      .set({ Authorization: 'Token abc' });
    expect(res.status).toBe(401);
  });
});
