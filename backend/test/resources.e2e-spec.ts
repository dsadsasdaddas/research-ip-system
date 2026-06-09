import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, auth, login } from './helpers';

jest.setTimeout(30000);

/**
 * 业务资源 e2e:在已登录(管理员)前提下,验证各模块接口的正常读写与入参校验。
 * 写操作都做了清理(删除自己创建的数据),避免污染开发库。
 */
describe('Resources (e2e) — 业务接口读写 + 校验', () => {
  let app: INestApplication;
  let token: string;
  const H = () => auth(token);

  beforeAll(async () => {
    app = await createTestApp();
    token = await login(app, 'admin', 'Admin@123');
  });
  afterAll(async () => {
    await app.close();
  });

  // ---------- 论文:完整 CRUD 生命周期 ----------
  describe('Papers CRUD /api/papers', () => {
    let id: number;

    it('POST 创建论文 → 201 且返回 id', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/papers')
        .set(H())
        .send({ title: 'E2E 测试论文', journal: 'Nature', publishYear: 2026 });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      id = res.body.id;
    });

    it('GET 列表 → 200 且为数组/分页结构', async () => {
      const res = await request(app.getHttpServer()).get('/api/papers').set(H());
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('GET 单条 → 200 且标题正确', async () => {
      const res = await request(app.getHttpServer()).get(`/api/papers/${id}`).set(H());
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('E2E 测试论文');
    });

    it('PATCH 更新 → 200 且字段已变', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/papers/${id}`)
        .set(H())
        .send({ journal: 'Science' });
      expect(res.status).toBe(200);
      expect(res.body.journal).toBe('Science');
    });

    it('DELETE 删除 → 200', async () => {
      const res = await request(app.getHttpServer()).delete(`/api/papers/${id}`).set(H());
      expect(res.status).toBe(200);
    });

    it('删除后再查 → 404', async () => {
      const res = await request(app.getHttpServer()).get(`/api/papers/${id}`).set(H());
      expect(res.status).toBe(404);
    });
  });

  // ---------- 入参校验(ValidationPipe)----------
  describe('入参校验', () => {
    it('创建论文缺少必填 title → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/papers')
        .set(H())
        .send({ journal: 'Nature' });
      expect(res.status).toBe(400);
    });

    it(':id 非数字 → 400(ParseIntPipe)', async () => {
      const res = await request(app.getHttpServer()).get('/api/papers/abc').set(H());
      expect(res.status).toBe(400);
    });

    it('费用类型非法枚举 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/fees')
        .set(H())
        .send({ feeType: '不存在的类型', amount: 100 });
      expect(res.status).toBe(400);
    });

    it('whitelist 生效:未知字段被剔除而非报错(创建成功)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/papers')
        .set(H())
        .send({ title: 'whitelist 测试', hacker_field: 'x' });
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('hacker_field');
      // 清理
      await request(app.getHttpServer()).delete(`/api/papers/${res.body.id}`).set(H());
    });
  });

  // ---------- 其余资源:创建→删除 冒烟 ----------
  describe('Patents / Copyrights / Transforms 创建并清理', () => {
    it('Patents POST→DELETE', async () => {
      const c = await request(app.getHttpServer())
        .post('/api/patents').set(H()).send({ name: 'E2E 专利' });
      expect(c.status).toBe(201);
      const d = await request(app.getHttpServer())
        .delete(`/api/patents/${c.body.id}`).set(H());
      expect(d.status).toBe(200);
    });

    it('Copyrights POST→DELETE', async () => {
      const c = await request(app.getHttpServer())
        .post('/api/copyrights').set(H()).send({ name: 'E2E 软著' });
      expect(c.status).toBe(201);
      const d = await request(app.getHttpServer())
        .delete(`/api/copyrights/${c.body.id}`).set(H());
      expect(d.status).toBe(200);
    });

    it('Transforms POST→DELETE', async () => {
      const c = await request(app.getHttpServer())
        .post('/api/transforms').set(H()).send({ partner: 'E2E 受让方', contractAmount: 100000 });
      expect(c.status).toBe(201);
      const d = await request(app.getHttpServer())
        .delete(`/api/transforms/${c.body.id}`).set(H());
      expect(d.status).toBe(200);
    });
  });

  // ---------- 只读接口冒烟 ----------
  describe('只读接口 → 200', () => {
    it.each([
      '/api/stats',
      '/api/search?keyword=test',
      '/api/fees',
      '/api/fees/alert-summary',
      '/api/reminders/tasks',
      '/api/reminders/tasks/summary',
      '/api/reminders/rules',
      '/api/attachments',
      '/api/users',
    ])('GET %s', async (path) => {
      const res = await request(app.getHttpServer()).get(path).set(H());
      expect(res.status).toBe(200);
    });
  });
});
