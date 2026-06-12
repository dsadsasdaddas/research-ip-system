import { SearchController } from './search.controller';
import type { SearchService } from './search.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    search: jest
      .fn()
      .mockResolvedValue({ engine: 'rust', elapsedMs: 1, total: 0, items: [] }),
  };
}

describe('SearchController', () => {
  let controller: SearchController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new SearchController(service as unknown as SearchService);
  });

  it('types 存在 → 拆分/trim/过滤空串,委托 service', async () => {
    const user = { id: 1 };
    await controller.search('量子', ' paper , patent, ', user as never);
    expect(service.search).toHaveBeenCalledWith(
      '量子',
      ['paper', 'patent'],
      user,
    );
  });

  it('types 含纯空白项 → 过滤掉', async () => {
    const user = { id: 1 };
    await controller.search('量子', '  ,  , ', user as never);
    expect(service.search).toHaveBeenCalledWith('量子', [], user);
  });

  it('types 为空字符串 → typeArr=[]', async () => {
    const user = { id: 1 };
    await controller.search('量子', '', user as never);
    expect(service.search).toHaveBeenCalledWith('量子', [], user);
  });

  it('q 为 undefined → 传空串给 service', async () => {
    const user = { id: 1 };
    await controller.search(undefined, undefined, user as never);
    expect(service.search).toHaveBeenCalledWith('', [], user);
  });
});
