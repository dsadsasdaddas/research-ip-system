import { BackupController } from './backup.controller';
import type { BackupService } from './backup.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    triggerBackup: jest.fn().mockResolvedValue({ id: 1, status: 'success' }),
    restoreBackup: jest.fn().mockResolvedValue({ id: 2, status: 'restored' }),
    findAll: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
  };
}

describe('BackupController', () => {
  let controller: BackupController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new BackupController(service as unknown as BackupService);
  });

  it('triggerBackup 委托 service', async () => {
    const user = { id: 1, username: 'admin' };
    await controller.triggerBackup(user as never);
    expect(service.triggerBackup).toHaveBeenCalledWith(user);
  });

  it('triggerBackup user 为 undefined 也透传', async () => {
    await controller.triggerBackup(undefined);
    expect(service.triggerBackup).toHaveBeenCalledWith(undefined);
  });

  it('restoreBackup 委托 service(带 user)', async () => {
    const user = { id: 1 };
    await controller.restoreBackup(7, user as never);
    expect(service.restoreBackup).toHaveBeenCalledWith(7, user);
  });

  it('findAll 解析 page/pageSize 字符串', async () => {
    await controller.findAll('3', '50');
    expect(service.findAll).toHaveBeenCalledWith(3, 50);
  });

  it('findAll 无 page/pageSize → 传 undefined', async () => {
    await controller.findAll(undefined, undefined);
    expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
  });
});
