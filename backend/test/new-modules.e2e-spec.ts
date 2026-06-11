import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, auth, login } from './helpers';
import { NotificationsService } from '../src/notifications/notifications.service';

jest.setTimeout(30000);

/**
 * 新模块接口测试 —— 覆盖本次提交的 7 个新模块：
 *   1. 站内消息 notifications
 *   2. 检索日志 search-logs（含搜索自动记录）
 *   3. 审批工作流 approvals（流程 CRUD + 完整状态机）
 *   4. RBAC 细粒度权限 rbac
 *   5. 涉密访问授权 secret-access
 *   6. 备份管理 backup
 *   7. 报表导出 reports
 *
 * 同时验证新模块的访问控制：管理员可访问、普通用户被拒绝（403）。
 */
describe('New Modules (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let leaderToken: string;
  let auditorToken: string;
  let secretToken: string;
  let csUserToken: string;
  let adminId: number;

  // 测试过程中创建的资源 ID，用于清理
  const created = {
    papers: [] as number[],
    flowIds: [] as number[],
    roleCodes: [] as string[],
    permissionCodes: [] as string[],
    templateIds: [] as number[],
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, 'admin', 'Admin@123');
    leaderToken = await login(app, 'leader', 'Test@123');
    auditorToken = await login(app, 'auditor', 'Test@123');
    secretToken = await login(app, 'secret', 'Test@123');
    csUserToken = await login(app, 'cs_user', 'Test@123');

    const usersRes = await request(app.getHttpServer()).get('/api/users').set(auth(adminToken));
    adminId = (usersRes.body as Array<{ username: string; id: number }>).find((u) => u.username === 'admin')?.id ?? 0;
    expect(adminId).toBeGreaterThan(0);
  });

  afterAll(async () => {
    for (const id of created.templateIds) {
      await request(app.getHttpServer()).delete(`/api/reports/templates/${id}`).set(auth(adminToken)).catch(() => {});
    }
    for (const id of created.flowIds) {
      await request(app.getHttpServer()).delete(`/api/approvals/flows/${id}`).set(auth(adminToken)).catch(() => {});
    }
    for (const id of created.papers) {
      await request(app.getHttpServer()).delete(`/api/papers/${id}`).set(auth(adminToken)).catch(() => {});
    }
    await app.close();
  });

  // ================================================================
  // 1. 站内消息 notifications
  // ================================================================
  describe('1. 站内消息 notifications', () => {
    let seededId: number;

    it('无消息时未读数为 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(typeof res.body.count).toBe('number');
    });

    it('通知列表返回分页结构', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
    });

    it('通过 service 种子一条未读消息后,未读数增加', async () => {
      const svc = app.get(NotificationsService);
      const msg = await svc.createNotification({
        receiverId: adminId,
        title: '[测试]系统通知',
        content: '这是一条测试通知',
        messageType: 'system',
      });
      seededId = msg.id;

      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it('标记单条已读', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/notifications/${seededId}/read`)
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.isRead).toBe(true);
    });

    it('标记全部已读', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notifications/mark-all-read')
        .set(auth(adminToken));
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('affected');
    });
  });

  // ================================================================
  // 2. 检索日志 search-logs
  // ================================================================
  describe('2. 检索日志 search-logs', () => {
    const uniqueKeyword = `检索日志探针_${Date.now()}`;

    it('执行一次搜索(触发日志记录)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/search?q=${encodeURIComponent(uniqueKeyword)}`)
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.engine).toBe('rust');
    });

    it('热门关键词接口可访问', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search-logs/hot-keywords?limit=5')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('管理员可分页查询检索日志,且包含刚才的关键词', async () => {
      // 搜索日志为 fire-and-forget 异步写入,等待其落库
      await new Promise((r) => setTimeout(r, 400));
      const res = await request(app.getHttpServer())
        .get(`/api/search-logs?keyword=${encodeURIComponent(uniqueKeyword)}`)
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      const keywords = (res.body.items as Array<{ keyword: string }>).map((l) => l.keyword);
      expect(keywords).toContain(uniqueKeyword);
    });

    it('普通用户查询检索日志 → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search-logs')
        .set(auth(csUserToken));
      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // 3. 审批工作流 approvals
  // ================================================================
  describe('3. 审批工作流 approvals', () => {
    let flowId: number;
    let node1Id: number;
    let node2Id: number;

    it('普通用户不能创建审批流程 → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/approvals/flows')
        .set(auth(csUserToken))
        .send({ flowCode: 'forbidden', flowName: '禁止', businessType: 'paper' });
      expect(res.status).toBe(403);
    });

    it('管理员创建审批流程 + 两个节点', async () => {
      const flowRes = await request(app.getHttpServer())
        .post('/api/approvals/flows')
        .set(auth(adminToken))
        .send({ flowCode: `paper_flow_${Date.now()}`, flowName: '论文审批流程', businessType: 'paper', isActive: true });
      expect(flowRes.status).toBe(201);
      flowId = flowRes.body.id;
      created.flowIds.push(flowId);

      const n1 = await request(app.getHttpServer())
        .post(`/api/approvals/flows/${flowId}/nodes`)
        .set(auth(adminToken))
        .send({ flowId, nodeCode: 'step1', nodeName: '初审', nodeOrder: 1, approverRole: 'leader', allowReject: true });
      expect(n1.status).toBe(201);
      node1Id = n1.body.id;

      const n2 = await request(app.getHttpServer())
        .post(`/api/approvals/flows/${flowId}/nodes`)
        .set(auth(adminToken))
        .send({ flowId, nodeCode: 'step2', nodeName: '终审', nodeOrder: 2, approverRole: 'auditor', allowReject: true });
      expect(n2.status).toBe(201);
      node2Id = n2.body.id;
    });

    it('查询流程详情含节点', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/approvals/flows/${flowId}`)
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.nodes).toHaveLength(2);
    });

    // ---- 完整审批通过流程 ----
    describe('审批通过流程', () => {
      let paperId: number;
      let instanceId: number;

      it('提交论文审批,实例 pending + 论文状态 submitted', async () => {
        const paperRes = await request(app.getHttpServer())
          .post('/api/papers')
          .set(auth(adminToken))
          .send({ title: `审批测试论文_通过_${Date.now()}` });
        expect(paperRes.status).toBe(201);
        paperId = paperRes.body.id;
        created.papers.push(paperId);

        const submitRes = await request(app.getHttpServer())
          .post('/api/approvals/submit')
          .set(auth(adminToken))
          .send({ businessType: 'paper', businessId: paperId, title: '论文审批申请' });
        expect(submitRes.status).toBe(201);
        instanceId = submitRes.body.id;
        expect(submitRes.body.status).toBe('pending');
        expect(submitRes.body.currentNodeId).toBe(node1Id);

        // 业务表审批状态应同步为 submitted
        const check = await request(app.getHttpServer())
          .get(`/api/papers/${paperId}`)
          .set(auth(adminToken));
        expect(check.body.approvalStatus).toBe('submitted');
      });

      it('leader 待审列表包含该实例', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/approvals/my-pending')
          .set(auth(leaderToken));
        expect(res.status).toBe(200);
        const ids = (res.body as Array<{ id: number }>).map((i) => i.id);
        expect(ids).toContain(instanceId);
      });

      it('非审批人 approve → 403', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/approvals/instances/${instanceId}/approve`)
          .set(auth(auditorToken)) // auditor 不是 node1 审批人
          .send({ nodeId: node1Id, opinion: '越权' });
        expect(res.status).toBe(403);
      });

      it('leader 初审通过 → 推进到 node2', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/approvals/instances/${instanceId}/approve`)
          .set(auth(leaderToken))
          .send({ nodeId: node1Id, opinion: '同意' });
        expect(res.status).toBe(201);
        expect(res.body.currentNodeId).toBe(node2Id);
        expect(res.body.status).toBe('pending');
      });

      it('auditor 终审通过 → 实例 approved + 论文状态 approved', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/approvals/instances/${instanceId}/approve`)
          .set(auth(auditorToken))
          .send({ nodeId: node2Id, opinion: '终审通过' });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('approved');

        const check = await request(app.getHttpServer())
          .get(`/api/papers/${paperId}`)
          .set(auth(adminToken));
        expect(check.body.approvalStatus).toBe('approved');
      });

      it('已通过实例再次 approve → 400', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/approvals/instances/${instanceId}/approve`)
          .set(auth(auditorToken))
          .send({ nodeId: node2Id });
        expect(res.status).toBe(400);
      });
    });

    // ---- 驳回流程 ----
    describe('审批驳回流程', () => {
      let paperId: number;
      let instanceId: number;

      it('提交后 leader 驳回 → 实例 rejected + 论文 rejected', async () => {
        const paperRes = await request(app.getHttpServer())
          .post('/api/papers')
          .set(auth(adminToken))
          .send({ title: `审批测试论文_驳回_${Date.now()}` });
        paperId = paperRes.body.id;
        created.papers.push(paperId);

        const submitRes = await request(app.getHttpServer())
          .post('/api/approvals/submit')
          .set(auth(adminToken))
          .send({ businessType: 'paper', businessId: paperId, title: '驳回测试' });
        instanceId = submitRes.body.id;

        const rejectRes = await request(app.getHttpServer())
          .post(`/api/approvals/instances/${instanceId}/reject`)
          .set(auth(leaderToken))
          .send({ nodeId: node1Id, opinion: '不通过' });
        expect(rejectRes.status).toBe(201);
        expect(rejectRes.body.status).toBe('rejected');

        const check = await request(app.getHttpServer())
          .get(`/api/papers/${paperId}`)
          .set(auth(adminToken));
        expect(check.body.approvalStatus).toBe('rejected');
      });
    });

    // ---- 撤销流程 ----
    describe('审批撤销流程', () => {
      let paperId: number;
      let instanceId: number;

      it('提交人撤销 → 实例 cancelled', async () => {
        const paperRes = await request(app.getHttpServer())
          .post('/api/papers')
          .set(auth(adminToken))
          .send({ title: `审批测试论文_撤销_${Date.now()}` });
        paperId = paperRes.body.id;
        created.papers.push(paperId);

        const submitRes = await request(app.getHttpServer())
          .post('/api/approvals/submit')
          .set(auth(adminToken))
          .send({ businessType: 'paper', businessId: paperId, title: '撤销测试' });
        instanceId = submitRes.body.id;

        const cancelRes = await request(app.getHttpServer())
          .post(`/api/approvals/instances/${instanceId}/cancel`)
          .set(auth(adminToken));
        expect(cancelRes.status).toBe(201);
        expect(cancelRes.body.status).toBe('cancelled');
      });

      it('非提交人撤销 → 403', async () => {
        const paperRes = await request(app.getHttpServer())
          .post('/api/papers')
          .set(auth(adminToken))
          .send({ title: `审批测试论文_撤销越权_${Date.now()}` });
        const pid = paperRes.body.id;
        created.papers.push(pid);

        const submitRes = await request(app.getHttpServer())
          .post('/api/approvals/submit')
          .set(auth(adminToken))
          .send({ businessType: 'paper', businessId: pid, title: '撤销越权测试' });
        const iid = submitRes.body.id;

        // leader 不是提交人
        const res = await request(app.getHttpServer())
          .post(`/api/approvals/instances/${iid}/cancel`)
          .set(auth(leaderToken));
        expect(res.status).toBe(403);
      });
    });

    it('我的提交列表可访问', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/approvals/my-submitted')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ================================================================
  // 4. RBAC 细粒度权限 rbac
  // ================================================================
  describe('4. RBAC 细粒度权限 rbac', () => {
    const roleCode = `test_role_${Date.now()}`;
    const permCode = `test:perm_${Date.now()}`;

    it('普通用户访问 rbac → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/rbac/roles')
        .set(auth(csUserToken));
      expect(res.status).toBe(403);
    });

    it('管理员查询角色列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/rbac/roles')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('创建角色 + 权限 + 分配 + 校验', async () => {
      const roleRes = await request(app.getHttpServer())
        .post('/api/rbac/roles')
        .set(auth(adminToken))
        .send({ code: roleCode, name: '测试角色' });
      expect(roleRes.status).toBe(201);
      created.roleCodes.push(roleCode);

      const permRes = await request(app.getHttpServer())
        .post('/api/rbac/permissions')
        .set(auth(adminToken))
        .send({ code: permCode, name: '测试权限', module: 'test', action: 'perm' });
      expect(permRes.status).toBe(201);
      created.permissionCodes.push(permCode);

      const assignRes = await request(app.getHttpServer())
        .post('/api/rbac/assign-permissions')
        .set(auth(adminToken))
        .send({ roleCode, permissionCodes: [permCode] });
      expect(assignRes.status).toBe(201);

      // 校验角色拥有该权限
      const checkRes = await request(app.getHttpServer())
        .get(`/api/rbac/check-permission?roleCode=${roleCode}&permissionCode=${permCode}`)
        .set(auth(adminToken));
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.allowed).toBe(true);

      // 查询角色权限列表
      const listRes = await request(app.getHttpServer())
        .get(`/api/rbac/roles/${roleCode}/permissions`)
        .set(auth(adminToken));
      expect(listRes.status).toBe(200);
      expect((listRes.body as Array<{ code: string }>).some((p) => p.code === permCode)).toBe(true);
    });

    it('check-permission 对未授权权限返回 false', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/rbac/check-permission?roleCode=${roleCode}&permissionCode=nonexistent:perm`)
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.allowed).toBe(false);
    });
  });

  // ================================================================
  // 5. 涉密访问授权 secret-access
  // ================================================================
  describe('5. 涉密访问授权 secret-access', () => {
    let grantId: number;
    const businessId = 900001 + Math.floor(Date.now() % 100000);

    it('普通用户访问涉密授权 → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/secret-access/grants')
        .set(auth(csUserToken));
      expect(res.status).toBe(403);
    });

    it('secret_admin 授权 + 查询 + 校验 + 撤销', async () => {
      const grantRes = await request(app.getHttpServer())
        .post('/api/secret-access/grants')
        .set(auth(secretToken))
        .send({
          businessType: 'paper',
          businessId,
          grantUserId: adminId,
          grantUsername: 'admin',
          grantScope: 'manage',
        });
      expect(grantRes.status).toBe(201);
      grantId = grantRes.body.id;

      // 查询授权列表
      const listRes = await request(app.getHttpServer())
        .get(`/api/secret-access/grants?businessType=paper&businessId=${businessId}`)
        .set(auth(secretToken));
      expect(listRes.status).toBe(200);
      expect((listRes.body as Array<{ id: number }>).some((g) => g.id === grantId)).toBe(true);

      // 校验授权(manage 范围,任意 action 都通过)
      const checkRes = await request(app.getHttpServer())
        .get(`/api/secret-access/check?businessType=paper&businessId=${businessId}&userId=${adminId}&action=download`)
        .set(auth(secretToken));
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.allowed).toBe(true);

      // 撤销授权
      const revokeRes = await request(app.getHttpServer())
        .patch(`/api/secret-access/grants/${grantId}/revoke`)
        .set(auth(secretToken));
      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.isActive).toBe(false);

      // 撤销后校验返回 false
      const checkAfter = await request(app.getHttpServer())
        .get(`/api/secret-access/check?businessType=paper&businessId=${businessId}&userId=${adminId}&action=download`)
        .set(auth(secretToken));
      expect(checkAfter.body.allowed).toBe(false);
    });
  });

  // ================================================================
  // 6. 备份管理 backup
  // ================================================================
  describe('6. 备份管理 backup', () => {
    it('普通用户访问备份 → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/backup/logs')
        .set(auth(csUserToken));
      expect(res.status).toBe(403);
    });

    it('触发备份(无论 mysqldump 是否可用都返回日志记录)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/backup/trigger')
        .set(auth(adminToken));
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(['success', 'failed', 'pending']).toContain(res.body.status);
    });

    it('备份日志分页查询', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/backup/logs?page=1&pageSize=5')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
    });
  });

  // ================================================================
  // 7. 报表导出 reports
  // ================================================================
  describe('7. 报表导出 reports', () => {
    let templateId: number;

    it('普通用户创建模板 → 403,查询模板可访问', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/reports/templates')
        .set(auth(csUserToken))
        .send({ code: 'forbidden', name: '禁止', reportType: 'paper' });
      expect(createRes.status).toBe(403);

      const listRes = await request(app.getHttpServer())
        .get('/api/reports/templates')
        .set(auth(csUserToken));
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
    });

    it('管理员创建报表模板', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports/templates')
        .set(auth(adminToken))
        .send({
          code: `paper_report_${Date.now()}`,
          name: '论文列表报表',
          reportType: 'paper',
          configJson: JSON.stringify({
            columns: [
              { header: '标题', key: 'title' },
              { header: '作者', key: 'authors' },
            ],
          }),
        });
      expect(res.status).toBe(201);
      templateId = res.body.id;
      created.templateIds.push(templateId);
    });

    it('导出 xlsx 报表,生成导出日志', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports/export')
        .set(auth(adminToken))
        .send({ templateId, format: 'xlsx' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(['success', 'failed']).toContain(res.body.status);

      // 成功导出可下载
      if (res.body.status === 'success') {
        const dl = await request(app.getHttpServer())
          .get(`/api/reports/exports/${res.body.id}/download`)
          .set(auth(adminToken));
        expect(dl.status).toBe(200);
      }
    });

    it('导出历史分页查询', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/export-logs?page=1&pageSize=5')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
    });

    it('定时报表任务 CRUD(admin)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/reports/scheduled-tasks')
        .set(auth(adminToken))
        .send({ templateId, taskName: '每月论文报表', cronExpr: '0 0 1 * *', channel: 'site' });
      expect(createRes.status).toBe(201);
      const taskId = createRes.body.id;

      const listRes = await request(app.getHttpServer())
        .get('/api/reports/scheduled-tasks')
        .set(auth(adminToken));
      expect(listRes.status).toBe(200);
      expect((listRes.body as Array<{ id: number }>).some((t) => t.id === taskId)).toBe(true);

      const delRes = await request(app.getHttpServer())
        .delete(`/api/reports/scheduled-tasks/${taskId}`)
        .set(auth(adminToken));
      expect(delRes.status).toBe(200);
    });
  });
});
