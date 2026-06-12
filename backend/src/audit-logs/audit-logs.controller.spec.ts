import { AuditLogsController } from './audit-logs.controller';
import type { AuditLogsService } from './audit-logs.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    findAll: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
  };
}

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new AuditLogsController(
      service as unknown as AuditLogsService,
    );
  });

  it('所有查询参数齐全 → 透传 service', async () => {
    await controller.findAll('kw', 'papers', 'create', 'bob', '2', '20');
    expect(service.findAll).toHaveBeenCalledWith({
      keyword: 'kw',
      module: 'papers',
      action: 'create',
      username: 'bob',
      page: 2,
      pageSize: 20,
    });
  });

  it('page/pageSize 缺省 → 兜底 1/50', async () => {
    await controller.findAll(
      'kw',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(service.findAll).toHaveBeenCalledWith({
      keyword: 'kw',
      module: undefined,
      action: undefined,
      username: undefined,
      page: 1,
      pageSize: 50,
    });
  });

  it('全部缺省 → keyword 等为 undefined,page=1/pageSize=50', async () => {
    await controller.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(service.findAll).toHaveBeenCalledWith({
      keyword: undefined,
      module: undefined,
      action: undefined,
      username: undefined,
      page: 1,
      pageSize: 50,
    });
  });
});
