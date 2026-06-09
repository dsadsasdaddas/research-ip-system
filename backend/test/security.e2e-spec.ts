import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, auth, login } from './helpers';

jest.setTimeout(30000);

/**
 * 安全性 e2e:鉴权(401)与授权(403)矩阵。
 * 这是本系统安全的"地基测试":
 *   1) 所有业务接口无 token 一律 401(防越权读写)
 *   2) 用户管理接口仅 sys_admin 可访问,其余角色 403(防提权)
 *   3) 审计日志接口仅 auditor/sys_admin/leader 可访问,其余 403
 */
describe('Security (e2e) — 鉴权与授权矩阵', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  // ---- 1) 无 token 必须 401 的接口清单(覆盖每个受保护控制器的代表路由)----
  const protectedRoutes: Array<[string, string]> = [
    ['get', '/api/papers'],
    ['get', '/api/papers/1'],
    ['post', '/api/papers'],
    ['patch', '/api/papers/1'],
    ['delete', '/api/papers/1'],
    ['get', '/api/patents'],
    ['post', '/api/patents'],
    ['delete', '/api/patents/1'],
    ['get', '/api/copyrights'],
    ['post', '/api/copyrights'],
    ['delete', '/api/copyrights/1'],
    ['get', '/api/transforms'],
    ['post', '/api/transforms'],
    ['delete', '/api/transforms/1'],
    ['get', '/api/fees'],
    ['get', '/api/fees/alert-summary'],
    ['post', '/api/fees'],
    ['post', '/api/fees/generate-plans'],
    ['get', '/api/stats'],
    ['get', '/api/search'],
    ['get', '/api/reminders/tasks'],
    ['get', '/api/reminders/tasks/summary'],
    ['get', '/api/reminders/rules'],
    ['post', '/api/reminders/rules'],
    ['get', '/api/attachments'],
    ['get', '/api/users'],
    ['post', '/api/users'],
    ['patch', '/api/users/1'],
    ['get', '/api/audit-logs'],
  ];

  it.each(protectedRoutes)('无 token: %s %s → 401', async (method, path) => {
    const res = await (request(app.getHttpServer()) as any)[method](path).send({});
    expect(res.status).toBe(401);
  });

  // ---- 2) 用户管理:仅 sys_admin ----
  describe('用户管理接口仅限 sys_admin', () => {
    it('sys_admin(admin)GET /api/users → 200', async () => {
      const token = await login(app, 'admin', 'Admin@123');
      const res = await request(app.getHttpServer()).get('/api/users').set(auth(token));
      expect(res.status).toBe(200);
    });

    it.each([
      ['researcher', 'cs_user'],
      ['dept_admin', 'cs_admin'],
      ['leader', 'leader'],
      ['auditor', 'auditor'],
    ])('非系统管理员 %s 访问 GET /api/users → 403', async (_role, username) => {
      const token = await login(app, username, 'Test@123');
      const res = await request(app.getHttpServer()).get('/api/users').set(auth(token));
      expect(res.status).toBe(403);
    });

    it('非系统管理员不能创建用户(防提权)POST /api/users → 403', async () => {
      const token = await login(app, 'cs_user', 'Test@123');
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set(auth(token))
        .send({ username: 'should_not_exist', password: 'Abc@123456', role: 'sys_admin' });
      expect(res.status).toBe(403);
    });
  });

  // ---- 3) 审计日志:仅 auditor / sys_admin / leader ----
  describe('审计日志接口角色限制', () => {
    it.each([
      ['auditor', 'auditor'],
      ['sys_admin', 'admin'],
      ['leader', 'leader'],
    ])('允许角色 %s 访问 GET /api/audit-logs → 200', async (_role, username) => {
      const password = username === 'admin' ? 'Admin@123' : 'Test@123';
      const token = await login(app, username, password);
      const res = await request(app.getHttpServer()).get('/api/audit-logs').set(auth(token));
      expect(res.status).toBe(200);
    });

    it.each([
      ['researcher', 'cs_user'],
      ['dept_secretary', 'cs_sec'],
      ['secret_admin', 'secret'],
    ])('禁止角色 %s 访问 GET /api/audit-logs → 403', async (_role, username) => {
      const token = await login(app, username, 'Test@123');
      const res = await request(app.getHttpServer()).get('/api/audit-logs').set(auth(token));
      expect(res.status).toBe(403);
    });
  });
});
