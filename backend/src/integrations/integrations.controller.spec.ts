import { IntegrationsController } from './integrations.controller';
import type { IntegrationsService } from './integrations.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    test: jest.fn().mockResolvedValue({ success: true }),
    remove: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
    findLogs: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
    findMappings: jest.fn().mockResolvedValue([{ id: 1 }]),
    createMapping: jest.fn().mockResolvedValue({ id: 1 }),
    removeMapping: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
    findAlerts: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    createAlert: jest.fn().mockResolvedValue({ id: 1 }),
    handleAlert: jest.fn().mockResolvedValue({ id: 1 }),
  };
}

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new IntegrationsController(
      service as unknown as IntegrationsService,
    );
  });

  it('configs: findAll / create / findOne / update / test / remove 全委托', async () => {
    await controller.findAll();
    await controller.create({ type: 'sms', name: 'x' } as never);
    await controller.findOne(1);
    await controller.update(1, { name: 'n' });
    await controller.test(1);
    await controller.remove(1);
    expect(service.findAll).toHaveBeenCalled();
    expect(service.create).toHaveBeenCalledWith({ type: 'sms', name: 'x' });
    expect(service.findOne).toHaveBeenCalledWith(1);
    expect(service.update).toHaveBeenCalledWith(1, { name: 'n' });
    expect(service.test).toHaveBeenCalledWith(1);
    expect(service.remove).toHaveBeenCalledWith(1);
  });

  it('logs 委托 findLogs,透传 query dto', async () => {
    const query = { type: 'sms', page: 1 } as never;
    await controller.logs(query);
    expect(service.findLogs).toHaveBeenCalledWith(query);
  });

  describe('mappings', () => {
    it('findMappings 透传两个可选 query', async () => {
      await controller.findMappings('sms', 'paper');
      expect(service.findMappings).toHaveBeenCalledWith('sms', 'paper');
    });
    it('findMappings 无参 → undefined/undefined', async () => {
      await controller.findMappings(undefined, undefined);
      expect(service.findMappings).toHaveBeenCalledWith(undefined, undefined);
    });
    it('createMapping 委托', async () => {
      await controller.createMapping({ integrationType: 'sms' } as never);
      expect(service.createMapping).toHaveBeenCalled();
    });
    it('removeMapping 委托', async () => {
      await controller.removeMapping(3);
      expect(service.removeMapping).toHaveBeenCalledWith(3);
    });
  });

  describe('alerts', () => {
    it('findAlerts:全部带参(含 page 字符串解析)', async () => {
      await controller.findAlerts('sms', 'open', '2', '10');
      expect(service.findAlerts).toHaveBeenCalledWith('sms', 'open', 2, 10);
    });
    it('findAlerts:无 page/pageSize → undefined', async () => {
      await controller.findAlerts(undefined, undefined, undefined, undefined);
      expect(service.findAlerts).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
    it('createAlert 委托', async () => {
      await controller.createAlert({ title: 't' } as never);
      expect(service.createAlert).toHaveBeenCalled();
    });
    it('handleAlert 委托(带 user)', async () => {
      const user = { id: 1 };
      await controller.handleAlert(5, { status: 'handled' }, user as never);
      expect(service.handleAlert).toHaveBeenCalledWith(
        5,
        { status: 'handled' },
        user,
      );
    });
  });
});
