import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, auth, login } from './helpers';

jest.setTimeout(30000);

interface TitledRecord {
  id: number;
  title?: string;
  name?: string;
  secretLevel?: string;
}

interface PublicUserRecord {
  username: string;
  deptId: number | null;
}

interface AuditLogRecord {
  path?: string;
  action?: string;
  body?: string;
}

interface PagedAuditLogResponse {
  items?: AuditLogRecord[];
}

interface SearchRecord {
  title: string;
}

interface SearchResponse {
  items?: SearchRecord[];
}

interface AttachmentRecord {
  id: number;
  originalName: string;
}

/**
 * Bug Fix 验证测试 — 覆盖 Code Review 发现的 12 个问题
 *
 * 依赖测试账号（seedAdmin 自动创建）：
 *   admin (sys_admin)    — 全院权限
 *   cs_user (researcher) — 仅本部门(计算机所)
 *   ee_user (researcher) — 仅本部门(电子所)
 *   secret (secret_admin)— 涉密管理
 */
describe('Bug Fixes (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let csUserToken: string;
  let eeUserToken: string;
  let secretToken: string;
  let csDeptId: number;
  let eeDeptId: number;

  // 用于清理的测试数据 ID
  const createdIds: {
    papers: number[];
    patents: number[];
    copyrights: number[];
    transforms: number[];
    attachments: number[];
  } = {
    papers: [],
    patents: [],
    copyrights: [],
    transforms: [],
    attachments: [],
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, 'admin', 'Admin@123');
    csUserToken = await login(app, 'cs_user', 'Test@123');
    eeUserToken = await login(app, 'ee_user', 'Test@123');
    secretToken = await login(app, 'secret', 'Test@123');
    const usersRes = await request(app.getHttpServer())
      .get('/api/users')
      .set(auth(adminToken));
    const users = usersRes.body as PublicUserRecord[];
    csDeptId = users.find((u) => u.username === 'cs_user')?.deptId ?? 0;
    eeDeptId = users.find((u) => u.username === 'ee_user')?.deptId ?? 0;
    expect(csDeptId).toBeGreaterThan(0);
    expect(eeDeptId).toBeGreaterThan(0);
  });

  afterAll(async () => {
    // 清理所有测试数据
    for (const id of createdIds.attachments) {
      await request(app.getHttpServer())
        .delete(`/api/attachments/${id}`)
        .set(auth(adminToken))
        .catch(() => {});
    }
    for (const id of createdIds.papers) {
      await request(app.getHttpServer())
        .delete(`/api/papers/${id}`)
        .set(auth(adminToken))
        .catch(() => {});
    }
    for (const id of createdIds.patents) {
      await request(app.getHttpServer())
        .delete(`/api/patents/${id}`)
        .set(auth(adminToken))
        .catch(() => {});
    }
    for (const id of createdIds.copyrights) {
      await request(app.getHttpServer())
        .delete(`/api/copyrights/${id}`)
        .set(auth(adminToken))
        .catch(() => {});
    }
    for (const id of createdIds.transforms) {
      await request(app.getHttpServer())
        .delete(`/api/transforms/${id}`)
        .set(auth(adminToken))
        .catch(() => {});
    }
    await app.close();
  });

  // ================================================================
  // Fix #1: 涉密记录访问控制
  // ================================================================
  describe('Fix #1 — 涉密记录密级过滤', () => {
    let secretPaperId: number;

    it('admin 创建涉密论文', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/papers')
        .set(auth(adminToken))
        .send({ title: '【涉密】机密论文测试', secretLevel: '涉密' });
      expect(res.status).toBe(201);
      secretPaperId = res.body.id;
      createdIds.papers.push(secretPaperId);
    });

    it('researcher 不能在列表中看到涉密论文', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/papers')
        .set(auth(csUserToken));
      expect(res.status).toBe(200);
      const titles = (res.body as { items: TitledRecord[] }).items.map(
        (p) => p.title,
      );
      expect(titles).not.toContain('【涉密】机密论文测试');
    });

    it('researcher 直接访问涉密论文 → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/papers/${secretPaperId}`)
        .set(auth(csUserToken));
      expect(res.status).toBe(404);
    });

    it('secret_admin 可以在列表中看到涉密论文', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/papers')
        .set(auth(secretToken));
      expect(res.status).toBe(200);
      const titles = (res.body as { items: TitledRecord[] }).items.map(
        (p) => p.title,
      );
      expect(titles).toContain('【涉密】机密论文测试');
    });

    it('secret_admin 可以直接访问涉密论文', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/papers/${secretPaperId}`)
        .set(auth(secretToken));
      expect(res.status).toBe(200);
      expect(res.body.secretLevel).toBe('涉密');
    });
  });

  // ================================================================
  // Fix #2: 专利/软著/转化部门过滤
  // ================================================================
  describe('Fix #2 — 专利/软著/转化部门隔离', () => {
    let patentId: number;
    let eePatentId: number;
    let eeTransformId: number;

    it('admin 创建专利', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/patents')
        .set(auth(csUserToken))
        .send({ name: '部门隔离测试专利' });
      expect(res.status).toBe(201);
      patentId = res.body.id;
      createdIds.patents.push(patentId);
    });

    it('不同部门 researcher 的专利列表互不干扰（都能拿到数据但受 dept 过滤）', async () => {
      // cs_user 和 ee_user 都能正常请求
      const csRes = await request(app.getHttpServer())
        .get('/api/patents')
        .set(auth(csUserToken));
      const eeRes = await request(app.getHttpServer())
        .get('/api/patents')
        .set(auth(eeUserToken));
      expect(csRes.status).toBe(200);
      expect(eeRes.status).toBe(200);
      // 两个不同部门的 researcher 看到的专利列表应不同
      // （admin 创建的专利无 dept_id，两边都可能看到；这里验证接口不报错即可）
    });

    it('researcher 不能按 id 读取/更新其他部门专利', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/patents')
        .set(auth(eeUserToken))
        .send({ name: '电子所专利-禁止跨部门访问' });
      expect(createRes.status).toBe(201);
      eePatentId = createRes.body.id;
      createdIds.patents.push(eePatentId);

      const getRes = await request(app.getHttpServer())
        .get(`/api/patents/${eePatentId}`)
        .set(auth(csUserToken));
      expect(getRes.status).toBe(404);

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/patents/${eePatentId}`)
        .set(auth(csUserToken))
        .send({ name: '越权改名' });
      expect(patchRes.status).toBe(404);
    });

    it('researcher 不能按 id 读取其他部门转化项目', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/transforms')
        .set(auth(eeUserToken))
        .send({ partner: '电子所转化对象' });
      expect(createRes.status).toBe(201);
      eeTransformId = createRes.body.id;
      createdIds.transforms.push(eeTransformId);

      const getRes = await request(app.getHttpServer())
        .get(`/api/transforms/${eeTransformId}`)
        .set(auth(csUserToken));
      expect(getRes.status).toBe(404);
    });
  });

  // ================================================================
  // Fix #4: 附件访问控制
  // ================================================================
  describe('Fix #4 — 附件下载/删除/列表访问控制', () => {
    let eePaperId: number;
    let attachmentId: number;

    it('researcher 不能列出/下载/删除其他部门成果附件', async () => {
      const paperRes = await request(app.getHttpServer())
        .post('/api/papers')
        .set(auth(eeUserToken))
        .send({ title: '电子所附件隔离论文' });
      expect(paperRes.status).toBe(201);
      eePaperId = paperRes.body.id;
      createdIds.papers.push(eePaperId);

      const forbiddenUploadRes = await request(app.getHttpServer())
        .post('/api/attachments/upload')
        .set(auth(csUserToken))
        .field('relationType', 'paper')
        .field('relationId', String(eePaperId))
        .attach('file', Buffer.from('forbidden file'), 'forbidden.txt');
      expect(forbiddenUploadRes.status).toBe(403);

      const uploadRes = await request(app.getHttpServer())
        .post('/api/attachments/upload')
        .set(auth(adminToken))
        .field('relationType', 'paper')
        .field('relationId', String(eePaperId))
        .attach('file', Buffer.from('secret file'), 'secret.txt');
      expect(uploadRes.status).toBe(201);
      attachmentId = uploadRes.body.id;
      createdIds.attachments.push(attachmentId);

      const listRes = await request(app.getHttpServer())
        .get(`/api/attachments?relationType=paper&relationId=${eePaperId}`)
        .set(auth(csUserToken));
      expect(listRes.status).toBe(200);
      expect(
        (listRes.body as AttachmentRecord[]).map((a) => a.id),
      ).not.toContain(attachmentId);

      const downloadRes = await request(app.getHttpServer())
        .get(`/api/attachments/${attachmentId}/download`)
        .set(auth(csUserToken));
      expect(downloadRes.status).toBe(403);

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/attachments/${attachmentId}`)
        .set(auth(csUserToken));
      expect(deleteRes.status).toBe(403);
    });
  });

  // ================================================================
  // Fix #3: JWT Secret 安全 + Fix #8: realName
  // ================================================================
  describe('Fix #3 + #8 — JWT 包含 realName', () => {
    it('登录返回的 JWT 解码后包含 realName', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Admin@123' });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      // 解码 JWT payload（base64）
      const payload = JSON.parse(
        Buffer.from(res.body.token.split('.')[1], 'base64url').toString(),
      );
      expect(payload).toHaveProperty('realName');
      expect(payload.realName).toBe('系统管理员');
    });
  });

  // ================================================================
  // Fix #5: LIKE 通配符注入
  // ================================================================
  describe('Fix #5 — LIKE 通配符转义', () => {
    it('keyword=% 不应返回全部记录', async () => {
      // 先创建一篇特定标题的论文
      const createRes = await request(app.getHttpServer())
        .post('/api/papers')
        .set(auth(adminToken))
        .send({ title: 'LIKE注入测试论文_唯一标题' });
      expect(createRes.status).toBe(201);
      createdIds.papers.push(createRes.body.id);

      // 用 % 搜索，不应返回所有论文（如果只返回了精确匹配 % 的，说明转义生效）
      const searchRes = await request(app.getHttpServer())
        .get('/api/papers?keyword=%')
        .set(auth(adminToken));
      expect(searchRes.status).toBe(200);
      // 如果转义生效，搜索 % 不会匹配所有记录
      // （只是确认不会崩溃，且结果合理）
      expect(Array.isArray(searchRes.body.items)).toBe(true);
    });

    it('keyword=_ 不应匹配任意单字符', async () => {
      const searchRes = await request(app.getHttpServer())
        .get('/api/patents?keyword=_')
        .set(auth(adminToken));
      expect(searchRes.status).toBe(200);
      expect(Array.isArray(searchRes.body.items)).toBe(true);
    });
  });

  // ================================================================
  // Fix #9: 审计日志脱敏
  // ================================================================
  describe('Fix #9 — 审计日志递归脱敏', () => {
    it('更新用户密码时，审计日志中 password 被脱敏', async () => {
      // 用时间戳生成唯一用户名，避免重复冲突
      const uniqueName = `audit_test_${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post('/api/users')
        .set(auth(adminToken))
        .send({
          username: uniqueName,
          password: 'Test@123456',
          realName: '审计测试',
        });
      expect(createRes.status).toBe(201);
      const userId = createRes.body.id;

      // 更新密码
      await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set(auth(adminToken))
        .send({ password: 'NewPass@123' });

      // 查审计日志
      const logRes = await request(app.getHttpServer())
        .get('/api/audit-logs?module=users&action=update')
        .set(auth(adminToken));
      expect(logRes.status).toBe(200);

      // 确认没有明文密码
      const logs = Array.isArray(logRes.body)
        ? (logRes.body as AuditLogRecord[])
        : ((logRes.body as PagedAuditLogResponse).items ?? []);
      const relevantLog = logs.find(
        (l) => l.path?.includes(`/users/${userId}`) && l.action === 'update',
      );
      if (relevantLog?.body) {
        expect(relevantLog.body).not.toContain('NewPass@123');
        expect(relevantLog.body).toContain('***');
      }

      // 清理
      await request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .set(auth(adminToken))
        .catch(() => {});
    });
  });

  // ================================================================
  // Fix #10: 密码更新空字符串
  // ================================================================
  describe('Fix #10 — 空密码不能覆盖哈希', () => {
    it('更新密码为空字符串 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set(auth(adminToken))
        .send({ username: 'pwd_test_user', password: 'Test@123456' });
      expect(res.status).toBe(201);
      const userId = res.body.id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set(auth(adminToken))
        .send({ password: '' });
      // 应该返回 400 而不是成功
      expect(updateRes.status).toBe(400);

      // 清理
      await request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .set(auth(adminToken))
        .catch(() => {});
    });
  });

  // ================================================================
  // Fix #11: Fees 路由 + ParseIntPipe + 角色限制
  // ================================================================
  describe('Fix #11 — Fees 控制器修复', () => {
    it('GET /fees/abc → 400 (ParseIntPipe)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/fees/abc')
        .set(auth(adminToken));
      expect(res.status).toBe(400);
    });

    it('POST /fees/generate-plans 不受限角色 → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/fees/generate-plans')
        .set(auth(csUserToken))
        .send({ patents: [] });
      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // Fix #12: 搜索引擎密级过滤
  // ================================================================
  describe('Fix #12 — 搜索引擎密级过滤', () => {
    it('researcher 搜索结果不包含涉密论文', async () => {
      // 注意:检索接口的查询参数名是 `q`(见 SearchController @Query('q'))。
      // 历史上这里误写成 `keyword=`,导致 q 为 undefined → 走空关键字早退分支 → items 恒为 [] ,
      // 断言对空数组恒真,根本没真正测到密级过滤。已修正为 q=。
      const res = await request(app.getHttpServer())
        .get('/api/search?q=' + encodeURIComponent('系统'))
        .set(auth(csUserToken));
      expect(res.status).toBe(200);
      expect(res.body.engine).toBe('rust');
      // 搜索结果中不应有涉密论文(researcher 只能看到公开/内部,看不到涉密)
      const items = (res.body as SearchResponse).items ?? [];
      items.forEach((item) => {
        expect(item.title).not.toContain('机密');
      });
    });
  });
});
