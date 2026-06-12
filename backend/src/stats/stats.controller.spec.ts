import { StatsController } from './stats.controller';
import type { StatsService } from './stats.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    getAll: jest.fn().mockResolvedValue({ totals: { papers: 1 } }),
  };
}

describe('StatsController', () => {
  let controller: StatsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new StatsController(service as unknown as StatsService);
  });

  it('getAll 委托 service', async () => {
    const res = await controller.getAll();
    expect(service.getAll).toHaveBeenCalledWith();
    expect(res).toEqual({ totals: { papers: 1 } });
  });
});
