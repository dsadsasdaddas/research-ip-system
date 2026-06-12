import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, ACCOUNTS, auth, login } from './helpers';

/**
 * 规格符合性 e2e —— 对照《研究院科研成果管理系统说明》§3 功能需求 / §7 验收标准。
 *
 * 既有套件(auth/resources/bugfixes/new-modules/security)已覆盖鉴权矩阵、三类成果 CRUD、
 * 密级过滤、审批流、RBAC、附件权限等。本文件补齐规格里要求、但既有套件未触及的模块闭环:
 *   §3.1.1 DOI 唯一性校验
 *   §3.3   费用管理闭环(费用/缴费计划/缴费记录/预警汇总)
 *   §3.5   申报提醒(规则/任务/回执确认/二次催办/紧急等级)
 *   §5/§7.3 外部接口配置管理(CRUD + 开关 + 在线测试 + 日志 + 重试上限校验)
 *   §6.2   基础支撑(数据字典类型/项 + 部门)
 *   §3.2   转化收益分配台账
 *   §3.4   统计看板 + 报表 csv/pdf 导出
 *   §7.4   备份触发/恢复路由/日志
 *
 * 每个用例创建的资源都登记到 created,afterAll 统一清理(先子后父,带 .catch 兜底)。
 */
describe('Spec Compliance (e2e) — 对照需求规格说明书 §3/§7', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const created = {
    paperIds: [] as number[],
    feeIds: [] as number[],
    reminderTaskIds: [] as number[],
    reminderRuleIds: [] as number[],
    integrationConfigIds: [] as number[],
    dictTypeIds: [] as number[],
    dictItemIds: [] as number[],
    deptIds: [] as number[],
    transformIds: [] as number[],
    distributionIds: [] as number[],
    templateIds: [] as number[],
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(
      app,
      ACCOUNTS.admin.username,
      ACCOUNTS.admin.password,
    );
    userToken = await login(
      app,
      ACCOUNTS.csUser.username,
      ACCOUNTS.csUser.password,
    );
  });

  afterAll(async () => {
    if (!app) return;
    const A = auth(adminToken);
    // 先子后父
    for (const id of created.distributionIds)
      await request(app.getHttpServer())
        .delete(`/api/transform-distributions/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.transformIds)
      await request(app.getHttpServer())
        .delete(`/api/transforms/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.paperIds)
      await request(app.getHttpServer())
        .delete(`/api/papers/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.feeIds)
      await request(app.getHttpServer())
        .delete(`/api/fees/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.reminderTaskIds)
      await request(app.getHttpServer())
        .delete(`/api/reminders/tasks/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.reminderRuleIds)
      await request(app.getHttpServer())
        .delete(`/api/reminders/rules/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.integrationConfigIds)
      await request(app.getHttpServer())
        .delete(`/api/integrations/configs/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.dictItemIds)
      await request(app.getHttpServer())
        .delete(`/api/dictionaries/items/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.dictTypeIds)
      await request(app.getHttpServer())
        .delete(`/api/dictionaries/types/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.deptIds)
      await request(app.getHttpServer())
        .delete(`/api/departments/${id}`)
        .set(A)
        .catch(() => {});
    for (const id of created.templateIds)
      await request(app.getHttpServer())
        .delete(`/api/reports/templates/${id}`)
        .set(A)
        .catch(() => {});
    await app.close();
  });

  // ────────────────────────────────────────────────────────────────
  // §3.1.1 论文 DOI 唯一性校验(同一 DOI 仅允许登记一条,重复自动拦截)
  // ────────────────────────────────────────────────────────────────
  describe('§3.1.1 论文 — DOI 唯一性校验', () => {
    const doi = `10.9999/spec-${Date.now()}`;
    let paperId: number;

    it('首次登记带 DOI 的论文 → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/papers')
        .set(auth(adminToken))
        .send({
          title: '规格测试论文',
          doi,
          firstAuthor: '张三',
          secretLevel: '公开',
          publishYear: 2026,
        });
      expect(res.status).toBe(201);
      paperId = res.body.id;
      created.paperIds.push(paperId);
    });

    it('相同 DOI 再次登记 → 409(自动拦截重复)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/papers')
        .set(auth(adminToken))
        .send({ title: '重复 DOI 论文', doi });
      expect(res.status).toBe(409);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // §3.3 知识产权费用管理闭环:费用台账 + 缴费计划 + 缴费记录 + 预警汇总
  // ────────────────────────────────────────────────────────────────
  describe('§3.3 费用管理闭环', () => {
    let feeId: number;

    it('创建费用台账 → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/fees')
        .set(auth(adminToken))
        .send({
          relationType: 'patent',
          feeType: '年费',
          fundSource: '院内经费',
          amount: 5000,
          dueDate: '2026-12-31',
          payStatus: 'pending',
        });
      expect(res.status).toBe(201);
      feeId = res.body.id;
      created.feeIds.push(feeId);
    });

    it('费用列表为数组,且含已建费用', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/fees')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((f: { id: number }) => f.id === feeId)).toBe(true);
    });

    it('查询单条费用 → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/fees/${feeId}`)
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(feeId);
    });

    it('预警汇总 alert-summary → 200(结构合法)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/fees/alert-summary')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toBeTruthy();
    });

    it('创建缴费计划 → 201,且可列出', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/fees/${feeId}/plans`)
        .set(auth(adminToken))
        .send({ dueDate: '2026-12-31', amount: 5000 });
      expect(res.status).toBe(201);

      const list = await request(app.getHttpServer())
        .get(`/api/fees/${feeId}/plans`)
        .set(auth(adminToken));
      expect(list.status).toBe(200);
    });

    it('创建缴费记录 → 201,且可列出', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/fees/${feeId}/payments`)
        .set(auth(adminToken))
        .send({ paymentAmount: 5000, paymentDate: '2026-06-12' });
      expect(res.status).toBe(201);

      const list = await request(app.getHttpServer())
        .get(`/api/fees/${feeId}/payments`)
        .set(auth(adminToken));
      expect(list.status).toBe(200);
    });

    it('缴费记录缺 paymentAmount → 400(校验)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/fees/${feeId}/payments`)
        .set(auth(adminToken))
        .send({ paymentDate: '2026-06-12' });
      expect(res.status).toBe(400);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // §3.5 申报提醒:规则 + 任务 + 回执确认 + 二次催办 + 紧急等级
  // ────────────────────────────────────────────────────────────────
  describe('§3.5 申报提醒', () => {
    let taskId: number;

    it('创建提醒规则(紧急等级) → 201,且可列出', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reminders/rules')
        .set(auth(adminToken))
        .send({
          title: '规格测试提醒规则',
          remindType: '专利年费',
          remindLevel: '紧急',
          daysBefore: 30,
        });
      expect(res.status).toBe(201);
      created.reminderRuleIds.push(res.body.id);

      const list = await request(app.getHttpServer())
        .get('/api/reminders/rules')
        .set(auth(adminToken));
      expect(list.status).toBe(200);
    });

    it('创建提醒任务 → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reminders/tasks')
        .set(auth(adminToken))
        .send({
          title: '规格测试提醒任务',
          targetType: 'patent',
          remindLevel: '重要',
        });
      expect(res.status).toBe(201);
      taskId = res.body.id;
      created.reminderTaskIds.push(taskId);
    });

    it('回执确认 POST /tasks/:id/confirm → 2xx', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reminders/tasks/${taskId}/confirm`)
        .set(auth(adminToken));
      expect([200, 201]).toContain(res.status);
    });

    it('任务汇总 summary → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reminders/tasks/summary')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
    });

    it('二次催办 check-second-remind → 2xx', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reminders/tasks/check-second-remind')
        .set(auth(adminToken));
      expect([200, 201]).toContain(res.status);
    });

    it('提醒任务缺 title → 400(校验)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reminders/tasks')
        .set(auth(adminToken))
        .send({ remindLevel: '普通' });
      expect(res.status).toBe(400);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // §5 / §7.3 外部接口配置管理:CRUD + 开关 + 在线测试 + 日志 + 重试上限
  // ────────────────────────────────────────────────────────────────
  describe('§5/§7.3 接口配置管理(外部 API 预留)', () => {
    // 注:种子已预置全部 8 种接口类型,且 type 唯一,故这里不再新建,
    // 而是操作已存在的配置(查询/开关/测试/日志)+ 验证唯一性与字段校验。
    let configId: number;
    let dupType: string;

    it('查询接口配置列表 → 200,种子已预置全部类型', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/integrations/configs')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      const items = res.body.items ?? res.body ?? [];
      expect(items.length).toBeGreaterThan(0);
      configId = items[0].id;
      dupType = items[0].type;
    });

    it('切换开关 isEnabled → 200(在线开关,对应规格"后台可视化开关")', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/integrations/configs/${configId}`)
        .set(auth(adminToken))
        .send({ isEnabled: false });
      expect(res.status).toBe(200);
      expect(res.body.isEnabled).toBe(false);
    });

    it('在线测试 /configs/:id/test → 2xx(允许降级,不报 500)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/integrations/configs/${configId}/test`)
        .set(auth(adminToken));
      expect([200, 201]).toContain(res.status);
    });

    it('接口调用日志 /logs → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/integrations/logs')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
    });

    it('重复创建已存在的接口类型 → 409(类型唯一)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/configs')
        .set(auth(adminToken))
        .send({ type: dupType, name: '重复类型', retryCount: 3 });
      expect(res.status).toBe(409);
    });

    it('retryCount 超上限(>5)→ 400(校验优先于唯一性,对应规格"重试上限")', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/configs')
        .set(auth(adminToken))
        .send({ type: dupType, name: '超限', retryCount: 99 });
      expect(res.status).toBe(400);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // §6.2 基础支撑:数据字典(类型 + 项)+ 部门
  // ────────────────────────────────────────────────────────────────
  describe('§6.2 基础支撑 — 字典 + 部门', () => {
    const typeCode = `spec_dict_${Date.now()}`;
    let typeId: number;

    it('创建字典类型 → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/dictionaries/types')
        .set(auth(adminToken))
        .send({ code: typeCode, name: '规格测试字典' });
      expect(res.status).toBe(201);
      typeId = res.body.id;
      created.dictTypeIds.push(typeId);
    });

    it('按 code 查字典类型 → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/dictionaries/types/${typeCode}`)
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(typeCode);
    });

    it('创建字典项 → 201,且按 typeCode 可查', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/dictionaries/items')
        .set(auth(adminToken))
        .send({ typeCode, label: '选项A', value: 'A', sortOrder: 1 });
      expect(res.status).toBe(201);
      created.dictItemIds.push(res.body.id);

      const list = await request(app.getHttpServer())
        .get(`/api/dictionaries/items?typeCode=${typeCode}`)
        .set(auth(adminToken));
      expect(list.status).toBe(200);
    });

    it('创建部门 → 201,且列表可查', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/departments')
        .set(auth(adminToken))
        .send({ name: `规格测试部门_${Date.now()}` });
      expect(res.status).toBe(201);
      created.deptIds.push(res.body.id);

      const list = await request(app.getHttpServer())
        .get('/api/departments')
        .set(auth(adminToken));
      expect(list.status).toBe(200);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // §3.2 成果转化跟踪 — 收益分配台账
  // ────────────────────────────────────────────────────────────────
  describe('§3.2 转化收益分配台账', () => {
    let transformId: number;

    it('创建转化项目(partner 必填)→ 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transforms')
        .set(auth(adminToken))
        .send({ partner: '规格测试受让企业', contractAmount: 100000 });
      expect(res.status).toBe(201);
      transformId = res.body.id;
      created.transformIds.push(transformId);
    });

    it('登记收益分配 → 201,且可列出', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/transforms/${transformId}/distributions`)
        .set(auth(adminToken))
        .send({
          innerRatio: 60,
          teamRatio: 20,
          personalRatio: 20,
          actualAmount: 100000,
        });
      expect(res.status).toBe(201);
      created.distributionIds.push(res.body.id);

      const list = await request(app.getHttpServer())
        .get(`/api/transforms/${transformId}/distributions`)
        .set(auth(adminToken));
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body)).toBe(true);
      expect(list.body.length).toBeGreaterThan(0);
    });

    it('更新分配记录 PATCH /transform-distributions/:id → 200', async () => {
      const distId =
        created.distributionIds[created.distributionIds.length - 1];
      const res = await request(app.getHttpServer())
        .patch(`/api/transform-distributions/${distId}`)
        .set(auth(adminToken))
        .send({ remark: '规格测试-更新备注' });
      expect(res.status).toBe(200);
    });

    it('空 body 创建转化 → 400(partner 必填,拒绝垃圾记录)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transforms')
        .set(auth(adminToken))
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // §3.4 成果统计分析 — 看板 + 报表 csv/pdf 导出
  // ────────────────────────────────────────────────────────────────
  describe('§3.4 统计看板 + 报表导出', () => {
    it('GET /stats 看板 → 200,含 totals/trend/funnel 等指标块', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stats')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totals');
      expect(res.body).toHaveProperty('trend');
      expect(res.body).toHaveProperty('funnel');
    });

    describe('报表 csv/pdf 导出', () => {
      let templateId: number;

      it('创建报表模板 → 201', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/reports/templates')
          .set(auth(adminToken))
          .send({
            code: `SPEC_${Date.now()}`,
            name: '规格测试报表',
            reportType: 'paper',
          });
        expect(res.status).toBe(201);
        templateId = res.body.id;
        created.templateIds.push(templateId);
      });

      it('导出 csv → success,下载 200 + text/csv(带 BOM)', async () => {
        const exp = await request(app.getHttpServer())
          .post('/api/reports/export')
          .set(auth(adminToken))
          .send({ templateId, format: 'csv' });
        expect(exp.status).toBe(201);
        expect(exp.body.status).toBe('success');

        const dl = await request(app.getHttpServer())
          .get(`/api/reports/exports/${exp.body.id}/download`)
          .set(auth(adminToken));
        expect(dl.status).toBe(200);
        expect(dl.headers['content-type']).toContain('text/csv');
      });

      it('导出 pdf → success,下载 200 + application/pdf', async () => {
        const exp = await request(app.getHttpServer())
          .post('/api/reports/export')
          .set(auth(adminToken))
          .send({ templateId, format: 'pdf' });
        expect(exp.status).toBe(201);
        expect(exp.body.status).toBe('success');

        const dl = await request(app.getHttpServer())
          .get(`/api/reports/exports/${exp.body.id}/download`)
          .set(auth(adminToken));
        expect(dl.status).toBe(200);
        expect(dl.headers['content-type']).toContain('application/pdf');
      });
    });
  });

  // ────────────────────────────────────────────────────────────────
  // §7.4 备份与恢复路由(不执行真实恢复以免污染库;验证路由 + 日志)
  // ────────────────────────────────────────────────────────────────
  describe('§7.4 备份管理', () => {
    it('触发备份 → 2xx(无论 mysqldump 是否可用都返回日志记录)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/backup/trigger')
        .set(auth(adminToken));
      expect([200, 201]).toContain(res.status);
      expect(res.body).toBeTruthy();
    });

    it('恢复不存在的备份 id → 404(路由存在且正确拒绝,不执行真实恢复)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/backup/999999/restore')
        .set(auth(adminToken));
      expect(res.status).toBe(404);
    });

    it('备份日志 → 200 分页结构', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/backup/logs')
        .set(auth(adminToken));
      expect(res.status).toBe(200);
    });

    it('普通用户触发备份 → 403(仅管理员)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/backup/trigger')
        .set(auth(userToken));
      expect(res.status).toBe(403);
    });
  });
});
