import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import {
  mockRepository,
  mockDataSource,
  mockQueryBuilder,
  mockAuthUser,
} from '../testing/mocks';
import type { Repository, DataSource } from 'typeorm';
import type { ApprovalFlow } from './entities/approval-flow.entity';
import type { ApprovalFlowNode } from './entities/approval-flow-node.entity';
import type { ApprovalInstance } from './entities/approval-instance.entity';
import type { ApprovalRecord } from './entities/approval-record.entity';
import { UserRole } from '../users/entities/user.entity';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let flowRepo: ReturnType<typeof mockRepository>;
  let nodeRepo: ReturnType<typeof mockRepository>;
  let instanceRepo: ReturnType<typeof mockRepository>;
  let recordRepo: ReturnType<typeof mockRepository>;
  let dataSource: ReturnType<typeof mockDataSource>;

  function buildService() {
    service = new ApprovalsService(
      flowRepo as unknown as Repository<ApprovalFlow>,
      nodeRepo as unknown as Repository<ApprovalFlowNode>,
      instanceRepo as unknown as Repository<ApprovalInstance>,
      recordRepo as unknown as Repository<ApprovalRecord>,
      dataSource as unknown as DataSource,
    );
  }

  beforeEach(() => {
    flowRepo = mockRepository();
    nodeRepo = mockRepository();
    instanceRepo = mockRepository();
    recordRepo = mockRepository();
    dataSource = mockDataSource();
    buildService();
  });

  // ==================== 流程定义管理 ====================

  describe('createFlow', () => {
    it('创建并保存流程', async () => {
      flowRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createFlow({
        flowCode: 'c',
        flowName: 'n',
        businessType: 'paper',
      });
      expect(flowRepo.save).toHaveBeenCalled();
      const created = flowRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.flowCode).toBe('c');
    });
  });

  describe('updateFlow', () => {
    it('update 后回查最新流程', async () => {
      flowRepo.findOneBy.mockResolvedValue({ id: 1, flowName: 'n2' });
      const res = await service.updateFlow(1, { flowName: 'n2' });
      expect(flowRepo.update).toHaveBeenCalledWith(1, { flowName: 'n2' });
      expect((res as { flowName: string }).flowName).toBe('n2');
    });

    it('流程不存在 → 返回 null', async () => {
      flowRepo.findOneBy.mockResolvedValue(null);
      await expect(service.updateFlow(1, {})).resolves.toBeNull();
    });
  });

  describe('findAllFlows', () => {
    it('带 businessType → 加入 where 条件', async () => {
      flowRepo.find.mockResolvedValue([{ id: 1 }]);
      await service.findAllFlows('paper');
      expect(flowRepo.find).toHaveBeenCalledWith({
        where: { businessType: 'paper' },
        order: { createTime: 'DESC' },
      });
    });

    it('不带 businessType → where 为空对象', async () => {
      flowRepo.find.mockResolvedValue([]);
      await service.findAllFlows(undefined);
      expect(flowRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createTime: 'DESC' },
      });
    });
  });

  describe('findOneFlow', () => {
    it('流程存在 → 附带节点返回', async () => {
      flowRepo.findOneBy.mockResolvedValue({ id: 1, flowName: 'f' });
      nodeRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      const res = (await service.findOneFlow(1)) as ApprovalFlow & {
        nodes: ApprovalFlowNode[];
      };
      expect(res.nodes).toHaveLength(2);
      expect(nodeRepo.find).toHaveBeenCalledWith({
        where: { flowId: 1 },
        order: { nodeOrder: 'ASC' },
      });
    });

    it('流程不存在 → 返回 null', async () => {
      flowRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOneFlow(1)).resolves.toBeNull();
      expect(nodeRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('removeFlow', () => {
    it('非系统流程 → 先删节点再删流程', async () => {
      flowRepo.findOneBy.mockResolvedValue({ id: 1, isSystem: false });
      await service.removeFlow(1);
      expect(nodeRepo.delete).toHaveBeenCalledWith({ flowId: 1 });
      expect(flowRepo.delete).toHaveBeenCalledWith(1);
    });

    it('流程不存在 → 404', async () => {
      flowRepo.findOneBy.mockResolvedValue(null);
      await expect(service.removeFlow(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('系统内置流程 → 400', async () => {
      flowRepo.findOneBy.mockResolvedValue({ id: 1, isSystem: true });
      await expect(service.removeFlow(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ==================== 流程节点管理 ====================

  describe('addNode', () => {
    it('流程存在 → 保存节点(注入 flowId)', async () => {
      flowRepo.findOneBy.mockResolvedValue({ id: 5 });
      nodeRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.addNode(5, { nodeCode: 'c', nodeName: 'n' } as never);
      const created = nodeRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.flowId).toBe(5);
      expect(nodeRepo.save).toHaveBeenCalled();
    });

    it('流程不存在 → 404', async () => {
      flowRepo.findOneBy.mockResolvedValue(null);
      await expect(service.addNode(1, {} as never)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateNode', () => {
    it('update 后回查节点', async () => {
      nodeRepo.findOneBy.mockResolvedValue({ id: 1, nodeName: 'n' });
      await service.updateNode(1, { nodeName: 'n' });
      expect(nodeRepo.update).toHaveBeenCalledWith(1, { nodeName: 'n' });
    });

    it('节点不存在 → null', async () => {
      nodeRepo.findOneBy.mockResolvedValue(null);
      await expect(service.updateNode(1, {})).resolves.toBeNull();
    });
  });

  describe('removeNode', () => {
    it('删除节点', async () => {
      await expect(service.removeNode(1)).resolves.toEqual({ success: true });
      expect(nodeRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  // ==================== submitForApproval ====================

  describe('submitForApproval', () => {
    function withFlowQb(terminal: Record<string, jest.Mock>) {
      const qb = mockQueryBuilder(terminal);
      flowRepo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      buildService();
      return qb;
    }

    it('无匹配流程 → 400', async () => {
      const qb = withFlowQb({ getMany: jest.fn().mockResolvedValue([]) });
      void qb;
      await expect(
        service.submitForApproval(
          { businessType: 'paper', businessId: 1, title: 't' },
          mockAuthUser(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('匹配流程但无节点 → 400', async () => {
      withFlowQb({
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 1, flowName: 'f', secretLevel: null }]),
      });
      nodeRepo.find.mockResolvedValue([]);
      await expect(
        service.submitForApproval(
          { businessType: 'paper', businessId: 1, title: 't' },
          mockAuthUser(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('优先选 secretLevel 精确匹配的流程 + 用 realName 作 submitUsername', async () => {
      withFlowQb({
        getMany: jest.fn().mockResolvedValue([
          { id: 1, flowName: 'generic', secretLevel: null },
          { id: 2, flowName: 'secret-flow', secretLevel: '涉密' },
        ]),
      });
      nodeRepo.find.mockResolvedValue([{ id: 10, nodeOrder: 1 }]);
      instanceRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      instanceRepo.save.mockImplementation((e: unknown) =>
        Promise.resolve({ ...(e as object), id: 100 }),
      );
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      const res = (await service.submitForApproval(
        { businessType: 'paper', businessId: 1, title: 't' },
        mockAuthUser(UserRole.SYS_ADMIN, 5, { realName: '张三' }),
      )) as Record<string, unknown>;

      expect(res.id).toBe(100);
      const created = instanceRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.flowId).toBe(2); // 选了 secretLevel 精确匹配
      expect(created.submitUsername).toBe('张三');
      expect(created.status).toBe('pending');
      expect(created.deptId).toBe(5);
      // 更新业务表为 submitted
      expect(dataSource.query).toHaveBeenCalledWith(
        'UPDATE `paper` SET approval_status = ? WHERE id = ?',
        ['submitted', 1],
      );
    });

    it('无 secretLevel 精确匹配 → 选通用流程;realName 为 null → 用 username', async () => {
      withFlowQb({
        getMany: jest
          .fn()
          .mockResolvedValue([
            { id: 7, flowName: 'generic', secretLevel: null },
          ]),
      });
      nodeRepo.find.mockResolvedValue([{ id: 10 }]);
      instanceRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      instanceRepo.save.mockResolvedValue({ id: 100 });
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      const user = mockAuthUser(UserRole.RESEARCHER, null);
      user.realName = null;
      await service.submitForApproval(
        {
          businessType: 'patent',
          businessId: 2,
          title: 't',
          remark: '备注',
        },
        user,
      );

      const inst = instanceRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(inst.flowId).toBe(7);
      expect(inst.submitUsername).toBe('test'); // realName 为空回退 username
      expect(inst.deptId).toBeNull();
      expect(inst.remark).toBe('备注');

      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.opinion).toBe('备注');
      expect(rec.action).toBe('submit');
    });

    it('两个流程都既有又有(secretLevel 都非空)→ find(非空) 命中,跳过 ?? 分支兜底', async () => {
      // flows 中既有 secretLevel 非空的,也有为 null 的;find(非空) 直接命中,?? 分支走 false
      withFlowQb({
        getMany: jest.fn().mockResolvedValue([
          { id: 2, flowName: 'f', secretLevel: '涉密' },
          { id: 1, flowName: 'g', secretLevel: null },
        ]),
      });
      nodeRepo.find.mockResolvedValue([{ id: 10 }]);
      instanceRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      instanceRepo.save.mockResolvedValue({ id: 100 });

      await service.submitForApproval(
        { businessType: 'paper', businessId: 1, title: 't' },
        mockAuthUser(),
      );
      const inst = instanceRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(inst.flowId).toBe(2);
    });
  });

  // ==================== approve ====================

  describe('approve', () => {
    const user = mockAuthUser(UserRole.SYS_ADMIN, 5, { realName: '审批人' });

    it('实例不存在 → 404', async () => {
      instanceRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.approve(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('实例非 pending → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'approved',
        currentNodeId: 10,
      });
      await expect(
        service.approve(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('当前节点不匹配 → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 99,
      });
      await expect(
        service.approve(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('节点不存在 → 404', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 10,
      });
      nodeRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.approve(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('非审批人 → 403', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 10,
        flowId: 1,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        approverRole: 'researcher',
        approverUserId: 999,
      });
      const other = mockAuthUser(UserRole.SYS_ADMIN, 5); // role/user 都不匹配
      await expect(
        service.approve(1, 10, {} as never, other),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('有下一节点 → 推进 currentNodeId + 记录 approve(nextNodeId 非空)', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 10,
        flowId: 1,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        approverRole: 'sys_admin',
        approverUserId: null,
      });
      nodeRepo.find.mockResolvedValue([
        { id: 10, nodeOrder: 1 },
        { id: 11, nodeOrder: 2 },
      ]);
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      await service.approve(1, 10, { opinion: '同意' } as never, user);

      expect(instanceRepo.update).toHaveBeenCalledWith(1, {
        currentNodeId: 11,
      });
      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.action).toBe('approve');
      expect(rec.nextNodeId).toBe(11);
      expect(rec.opinion).toBe('同意');
      expect(rec.operatorName).toBe('审批人');
      // 推进分支不更新业务表
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('opinion 为空 → 记录 opinion 为 null', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 10,
        flowId: 1,
      });
      nodeRepo.findOneBy.mockResolvedValue({ id: 10, approverUserId: 1 }); // 用 user.id 匹配
      nodeRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      await service.approve(1, 10, {} as never, user);
      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.opinion).toBeNull();
    });

    it('已是最后节点 → status=approved + currentNodeId=null + 更新业务表 approved', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 11,
        flowId: 1,
        businessType: 'paper',
        businessId: 7,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 11,
        approverRole: 'sys_admin',
      });
      nodeRepo.find.mockResolvedValue([
        { id: 10, nodeOrder: 1 },
        { id: 11, nodeOrder: 2 },
      ]);
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      await service.approve(1, 11, {} as never, user);

      const updateArgs = instanceRepo.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(updateArgs.status).toBe('approved');
      expect(updateArgs.currentNodeId).toBeNull();
      expect(updateArgs.finishTime).toBeInstanceOf(Date);

      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.nextNodeId).toBeNull();
      expect(dataSource.query).toHaveBeenCalledWith(
        'UPDATE `paper` SET approval_status = ? WHERE id = ?',
        ['approved', 7],
      );
    });

    it('返回回查的实例', async () => {
      instanceRepo.findOneBy
        .mockResolvedValueOnce({
          id: 1,
          status: 'pending',
          currentNodeId: 10,
          flowId: 1,
        })
        .mockResolvedValueOnce({ id: 1, status: 'pending', currentNodeId: 11 });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        approverRole: 'sys_admin',
      });
      nodeRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      const res = await service.approve(1, 10, {} as never, user);
      expect((res as Record<string, unknown>).currentNodeId).toBe(11);
    });

    it('最后节点完成(realName 为空 + opinion 为空)→ 覆盖完成分支的 username/opinion 回退', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 11,
        flowId: 1,
        businessType: 'paper',
        businessId: 7,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 11,
        approverRole: 'sys_admin',
      });
      nodeRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      const noName = mockAuthUser(UserRole.SYS_ADMIN, 5);
      noName.realName = null;
      await service.approve(1, 11, {} as never, noName);

      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.opinion).toBeNull();
      expect(rec.operatorName).toBe('test');
      expect(rec.nextNodeId).toBeNull();
    });
  });

  // ==================== reject ====================

  describe('reject', () => {
    const user = mockAuthUser(UserRole.SYS_ADMIN, 5, { realName: '李四' });

    it('实例不存在 → 404', async () => {
      instanceRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.reject(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('实例非 pending → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 1, status: 'rejected' });
      await expect(
        service.reject(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('节点不存在 → 404', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
      nodeRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.reject(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('节点不允许驳回(allowReject=false) → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        allowReject: false,
        approverRole: 'sys_admin',
      });
      await expect(
        service.reject(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('非审批人 → 403', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        allowReject: true,
        approverRole: 'researcher',
        approverUserId: 999,
      });
      const other = mockAuthUser(UserRole.SYS_ADMIN, 5);
      await expect(
        service.reject(1, 10, {} as never, other),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('成功驳回 → status=rejected + 业务表 rejected(realName 为空回退 username + opinion 为空回退 null)', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        businessType: 'fee',
        businessId: 3,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        allowReject: true,
        approverRole: 'sys_admin',
      });
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      const noName = mockAuthUser(UserRole.SYS_ADMIN, 5);
      noName.realName = null;
      await service.reject(1, 10, {} as never, noName);

      const updateArgs = instanceRepo.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(updateArgs.status).toBe('rejected');
      expect(updateArgs.currentNodeId).toBeNull();

      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.action).toBe('reject');
      expect(rec.opinion).toBeNull();
      expect(rec.operatorName).toBe('test');
      expect(dataSource.query).toHaveBeenCalledWith(
        'UPDATE `fee` SET approval_status = ? WHERE id = ?',
        ['rejected', 3],
      );
    });
  });

  // ==================== returnToPrevious ====================

  describe('returnToPrevious', () => {
    const user = mockAuthUser(UserRole.SYS_ADMIN, 5, { realName: '王五' });

    it('实例不存在 → 404', async () => {
      instanceRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.returnToPrevious(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('实例非 pending → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 1, status: 'cancelled' });
      await expect(
        service.returnToPrevious(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('节点不存在 → 404', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
      nodeRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.returnToPrevious(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('非审批人 → 403', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        approverRole: 'researcher',
        approverUserId: 999,
      });
      const other = mockAuthUser(UserRole.SYS_ADMIN, 5);
      await expect(
        service.returnToPrevious(1, 10, {} as never, other),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('已是第一个节点(findIndex=-1) → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        flowId: 1,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        approverRole: 'sys_admin',
      });
      // find 返回的列表里没有 nodeId,findIndex 返回 -1 → <=0
      nodeRepo.find.mockResolvedValue([{ id: 99 }, { id: 11 }]);
      await expect(
        service.returnToPrevious(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('当前在第一节点(findIndex=0) → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        flowId: 1,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 10,
        approverRole: 'sys_admin',
      });
      nodeRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      await expect(
        service.returnToPrevious(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('成功退回 → currentNodeId=上一节点 + 记录 return(realName 为空回退 username + opinion 为空回退 null)', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        flowId: 1,
      });
      nodeRepo.findOneBy.mockResolvedValue({
        id: 11,
        approverRole: 'sys_admin',
      });
      nodeRepo.find.mockResolvedValue([
        { id: 10, nodeOrder: 1 },
        { id: 11, nodeOrder: 2 },
        { id: 12, nodeOrder: 3 },
      ]);
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      const noName = mockAuthUser(UserRole.SYS_ADMIN, 5);
      noName.realName = null;
      await service.returnToPrevious(1, 11, {} as never, noName);

      expect(instanceRepo.update).toHaveBeenCalledWith(1, {
        currentNodeId: 10,
      });
      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.action).toBe('return');
      expect(rec.nextNodeId).toBe(10);
      expect(rec.opinion).toBeNull();
      expect(rec.operatorName).toBe('test');
    });
  });

  // ==================== cancel ====================

  describe('cancel', () => {
    const user = mockAuthUser(UserRole.RESEARCHER, 5, { realName: '赵六' });

    it('实例不存在 → 404', async () => {
      instanceRepo.findOneBy.mockResolvedValue(null);
      await expect(service.cancel(1, user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('非提交人 → 403', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        submitUserId: 999,
      });
      await expect(service.cancel(1, user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('非 pending 状态 → 400', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'approved',
        submitUserId: user.id,
      });
      await expect(service.cancel(1, user)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('成功撤销 → status=cancelled + 业务表 cancelled', async () => {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        submitUserId: user.id,
        businessType: 'patent',
        businessId: 4,
      });
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));

      await service.cancel(1, user);

      const updateArgs = instanceRepo.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(updateArgs.status).toBe('cancelled');
      expect(updateArgs.currentNodeId).toBeNull();
      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.action).toBe('cancel');
      expect(rec.operatorName).toBe('赵六');
      expect(dataSource.query).toHaveBeenCalledWith(
        'UPDATE `patent` SET approval_status = ? WHERE id = ?',
        ['cancelled', 4],
      );
    });

    it('operator realName 为 null → 用 username', async () => {
      const u = mockAuthUser(UserRole.RESEARCHER, 5);
      u.realName = null;
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        submitUserId: u.id,
        businessType: 'paper',
        businessId: 1,
      });
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.cancel(1, u);
      const rec = recordRepo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(rec.operatorName).toBe('test');
    });
  });

  // ==================== 查询 ====================

  describe('findMyPending', () => {
    it('无匹配节点 → 返回空数组(不走 instanceRepo.find)', async () => {
      nodeRepo.find.mockResolvedValue([]);
      await expect(
        service.findMyPending(mockAuthUser(UserRole.RESEARCHER, 5)),
      ).resolves.toEqual([]);
      expect(instanceRepo.find).not.toHaveBeenCalled();
    });

    it('有匹配节点 → 按 currentNodeId In + pending 查询', async () => {
      nodeRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      instanceRepo.find.mockResolvedValue([{ id: 1 }]);
      const res = await service.findMyPending(
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toEqual([{ id: 1 }]);
      const callArg = instanceRepo.find.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg.where).toMatchObject({ status: 'pending' });
    });
  });

  describe('findMySubmitted', () => {
    it('按 submitUserId 查询', async () => {
      instanceRepo.find.mockResolvedValue([{ id: 1 }]);
      const res = await service.findMySubmitted(
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(res).toEqual([{ id: 1 }]);
      expect(instanceRepo.find).toHaveBeenCalledWith({
        where: { submitUserId: 1 },
        order: { submitTime: 'DESC' },
      });
    });
  });

  describe('findByBusiness', () => {
    it('实例存在 → 附带记录', async () => {
      instanceRepo.findOne.mockResolvedValue({
        id: 5,
        businessType: 'paper',
        businessId: 1,
      });
      recordRepo.find.mockResolvedValue([{ id: 100 }]);
      const res = await service.findByBusiness('paper', 1);
      expect(res.instance).not.toBeNull();
      expect(res.records).toHaveLength(1);
    });

    it('实例不存在 → instance/records 均空', async () => {
      instanceRepo.findOne.mockResolvedValue(null);
      const res = await service.findByBusiness('paper', 1);
      expect(res.instance).toBeNull();
      expect(res.records).toEqual([]);
      expect(recordRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('getInstanceDetail', () => {
    it('实例存在 → 附带 flow/nodes/records', async () => {
      instanceRepo.findOneBy.mockResolvedValue({ id: 5, flowId: 2 });
      flowRepo.findOneBy.mockResolvedValue({ id: 2, flowName: 'f' });
      nodeRepo.find.mockResolvedValue([{ id: 10 }]);
      recordRepo.find.mockResolvedValue([{ id: 100 }]);
      const res = await service.getInstanceDetail(5);
      expect(res.instance).not.toBeNull();
      expect(res.flow).not.toBeNull();
      expect(res.nodes).toHaveLength(1);
      expect(res.records).toHaveLength(1);
    });

    it('实例不存在 → 全空', async () => {
      instanceRepo.findOneBy.mockResolvedValue(null);
      const res = await service.getInstanceDetail(5);
      expect(res.instance).toBeNull();
      expect(res.flow).toBeNull();
      expect(res.nodes).toEqual([]);
      expect(res.records).toEqual([]);
      expect(flowRepo.findOneBy).not.toHaveBeenCalled();
    });
  });

  // ==================== updateBusinessStatus(SQL 注入防护) ====================

  describe('updateBusinessStatus(SQL 注入白名单)', () => {
    // 通过 submitForApproval 间接触发,以覆盖合法类型 + 原生 SQL
    function setupSubmit(flows: unknown[]) {
      const qb = mockQueryBuilder({
        getMany: jest.fn().mockResolvedValue(flows),
      });
      flowRepo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      nodeRepo.find.mockResolvedValue([{ id: 10 }]);
      instanceRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      instanceRepo.save.mockResolvedValue({ id: 100 });
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      buildService();
    }

    it.each([
      'paper',
      'patent',
      'copyright',
      'transform',
      'fee',
      'secret',
    ] as const)('合法业务类型 %s → 执行原生 UPDATE', async (bt) => {
      setupSubmit([{ id: 1, flowName: 'f', secretLevel: null }]);
      await service.submitForApproval(
        { businessType: bt, businessId: 1, title: 't' },
        mockAuthUser(),
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        `UPDATE \`${bt}\` SET approval_status = ? WHERE id = ?`,
        ['submitted', 1],
      );
    });

    it('非法业务类型(注入尝试)→ 400 且不执行任何 SQL', async () => {
      setupSubmit([{ id: 1, flowName: 'f', secretLevel: null }]);
      await expect(
        service.submitForApproval(
          {
            businessType: 'paper; DROP TABLE paper; --',
            businessId: 1,
            title: 't',
          },
          mockAuthUser(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  // ==================== verifyApprover(私有,通过 approve 覆盖各分支) ====================

  describe('verifyApprover(私有方法各分支)', () => {
    const user = mockAuthUser(UserRole.DEPT_ADMIN, 5);

    function setupInstanceAndNode(node: Record<string, unknown>) {
      instanceRepo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        currentNodeId: 10,
        flowId: 1,
      });
      nodeRepo.findOneBy.mockResolvedValue(node);
      nodeRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      recordRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
    }

    it('approverRole 命中(role 相同,user.id 不同)→ 放行', async () => {
      setupInstanceAndNode({
        id: 10,
        approverRole: 'dept_admin',
        approverUserId: 999,
      });
      await expect(
        service.approve(1, 10, {} as never, user),
      ).resolves.toBeDefined();
    });

    it('approverUserId 命中(id 相同,role 不同)→ 放行', async () => {
      setupInstanceAndNode({
        id: 10,
        approverRole: 'researcher',
        approverUserId: user.id,
      });
      await expect(
        service.approve(1, 10, {} as never, user),
      ).resolves.toBeDefined();
    });

    it('approverRole 为 null,仅 approverUserId 匹配 → 放行(覆盖 matchByRole 的 null 短路)', async () => {
      setupInstanceAndNode({
        id: 10,
        approverRole: null,
        approverUserId: user.id,
      });
      await expect(
        service.approve(1, 10, {} as never, user),
      ).resolves.toBeDefined();
    });

    it('approverUserId 为 null,仅 approverRole 匹配 → 放行(覆盖 matchByUser 的 null 短路)', async () => {
      setupInstanceAndNode({
        id: 10,
        approverRole: 'dept_admin',
        approverUserId: null,
      });
      await expect(
        service.approve(1, 10, {} as never, user),
      ).resolves.toBeDefined();
    });

    it('两者都不匹配(role != null & user != null 但值不同)→ 403', async () => {
      setupInstanceAndNode({
        id: 10,
        approverRole: 'researcher',
        approverUserId: 888,
      });
      await expect(
        service.approve(1, 10, {} as never, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
