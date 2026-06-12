import { ApprovalsController } from './approvals.controller';
import type { ApprovalsService } from './approvals.service';
import type { MockObject } from '../testing/mocks';
import type { AuthUser } from '../auth/types/auth-user.interface';

function mockService(): MockObject {
  return {
    createFlow: jest.fn().mockResolvedValue({ id: 1 }),
    findAllFlows: jest.fn().mockResolvedValue([{ id: 1 }]),
    findOneFlow: jest.fn().mockResolvedValue({ id: 1 }),
    updateFlow: jest.fn().mockResolvedValue({ id: 1 }),
    removeFlow: jest.fn().mockResolvedValue({ success: true }),
    addNode: jest.fn().mockResolvedValue({ id: 10 }),
    updateNode: jest.fn().mockResolvedValue({ id: 10 }),
    removeNode: jest.fn().mockResolvedValue({ success: true }),
    submitForApproval: jest.fn().mockResolvedValue({ id: 100 }),
    findMyPending: jest.fn().mockResolvedValue([{ id: 1 }]),
    findMySubmitted: jest.fn().mockResolvedValue([{ id: 1 }]),
    getInstanceDetail: jest.fn().mockResolvedValue({
      instance: null,
      flow: null,
      nodes: [],
      records: [],
    }),
    approve: jest.fn().mockResolvedValue({ id: 100 }),
    reject: jest.fn().mockResolvedValue({ id: 100 }),
    returnToPrevious: jest.fn().mockResolvedValue({ id: 100 }),
    cancel: jest.fn().mockResolvedValue({ id: 100 }),
  };
}

describe('ApprovalsController', () => {
  let controller: ApprovalsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new ApprovalsController(
      service as unknown as ApprovalsService,
    );
  });

  const user: AuthUser = {
    id: 1,
    username: 'test',
    realName: 't',
    role: 'sys_admin' as never,
    deptId: 5,
  };

  // ==================== 流程定义 CRUD ====================

  it('createFlow 委托 service', async () => {
    const dto = { flowCode: 'c', flowName: 'n', businessType: 'paper' };
    await controller.createFlow(dto);
    expect(service.createFlow).toHaveBeenCalledWith(dto);
  });

  it('findAllFlows 带 businessType', async () => {
    await controller.findAllFlows('paper');
    expect(service.findAllFlows).toHaveBeenCalledWith('paper');
  });

  it('findAllFlows 不带 businessType → undefined', async () => {
    await controller.findAllFlows(undefined);
    expect(service.findAllFlows).toHaveBeenCalledWith(undefined);
  });

  it('findOneFlow 委托 service', async () => {
    await controller.findOneFlow(1);
    expect(service.findOneFlow).toHaveBeenCalledWith(1);
  });

  it('updateFlow 委托 service', async () => {
    const dto = { flowName: 'n2' };
    await controller.updateFlow(1, dto);
    expect(service.updateFlow).toHaveBeenCalledWith(1, dto);
  });

  it('removeFlow 委托 service', async () => {
    await controller.removeFlow(1);
    expect(service.removeFlow).toHaveBeenCalledWith(1);
  });

  // ==================== 流程节点 CRUD ====================

  it('addNode 委托 service(传 flowId)', async () => {
    const dto = { nodeCode: 'c', nodeName: 'n' };
    await controller.addNode(5, dto as never);
    expect(service.addNode).toHaveBeenCalledWith(5, dto);
  });

  it('updateNode 委托 service', async () => {
    const dto = { nodeName: 'n2' };
    await controller.updateNode(10, dto);
    expect(service.updateNode).toHaveBeenCalledWith(10, dto);
  });

  it('removeNode 委托 service', async () => {
    await controller.removeNode(10);
    expect(service.removeNode).toHaveBeenCalledWith(10);
  });

  // ==================== 审批实例操作 ====================

  it('submitForApproval 委托 service(dto + user)', async () => {
    const dto = { businessType: 'paper', businessId: 1, title: 't' };
    await controller.submitForApproval(dto, user);
    expect(service.submitForApproval).toHaveBeenCalledWith(dto, user);
  });

  it('findMyPending 委托 service', async () => {
    await controller.findMyPending(user);
    expect(service.findMyPending).toHaveBeenCalledWith(user);
  });

  it('findMySubmitted 委托 service', async () => {
    await controller.findMySubmitted(user);
    expect(service.findMySubmitted).toHaveBeenCalledWith(user);
  });

  it('getInstanceDetail 委托 service', async () => {
    await controller.getInstanceDetail(7);
    expect(service.getInstanceDetail).toHaveBeenCalledWith(7);
  });

  it('approve 委托 service(拆出 dto.nodeId)', async () => {
    const dto = { nodeId: 10, opinion: '同意' };
    await controller.approve(1, dto, user);
    expect(service.approve).toHaveBeenCalledWith(1, 10, dto, user);
  });

  it('reject 委托 service(拆出 dto.nodeId)', async () => {
    const dto = { nodeId: 10, opinion: '不行' };
    await controller.reject(1, dto, user);
    expect(service.reject).toHaveBeenCalledWith(1, 10, dto, user);
  });

  it('returnToPrevious 委托 service(拆出 dto.nodeId)', async () => {
    const dto = { nodeId: 11, opinion: '退回' };
    await controller.returnToPrevious(1, dto, user);
    expect(service.returnToPrevious).toHaveBeenCalledWith(1, 11, dto, user);
  });

  it('cancel 委托 service(id + user)', async () => {
    await controller.cancel(1, user);
    expect(service.cancel).toHaveBeenCalledWith(1, user);
  });
});
