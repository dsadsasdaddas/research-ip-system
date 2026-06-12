import { SearchLogsController } from './search-logs.controller';
import type { SearchLogsService } from './search-logs.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    findAll: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
    findHotKeywords: jest.fn().mockResolvedValue([{ keyword: 'kw', count: 1 }]),
    log: jest.fn().mockResolvedValue(undefined),
    findRecent: jest.fn().mockResolvedValue([]),
  };
}

describe('SearchLogsController', () => {
  let controller: SearchLogsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new SearchLogsController(
      service as unknown as SearchLogsService,
    );
  });

  it('findAll 透传 keyword/page/pageSize', async () => {
    await controller.findAll({ keyword: 'kw', page: 2, pageSize: 50 });
    expect(service.findAll).toHaveBeenCalledWith({
      keyword: 'kw',
      page: 2,
      pageSize: 50,
    });
  });

  it('findAll 全 undefined', async () => {
    await controller.findAll({});
    expect(service.findAll).toHaveBeenCalledWith({
      keyword: undefined,
      page: undefined,
      pageSize: undefined,
    });
  });

  it('hotKeywords 有 limit 字符串 → +limit', async () => {
    await controller.hotKeywords('25');
    expect(service.findHotKeywords).toHaveBeenCalledWith(25);
  });

  it('hotKeywords 无 limit → 默认 10', async () => {
    await controller.hotKeywords(undefined);
    expect(service.findHotKeywords).toHaveBeenCalledWith(10);
  });
});
