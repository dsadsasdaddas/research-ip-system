import { FeeScheduleService } from './fee-schedule.service';
import { mockRepository, mockQueryBuilder } from '../testing/mocks';
import type { Repository } from 'typeorm';
import { Fee } from './entities/fee.entity';

describe('FeeScheduleService', () => {
  it('affected>0 → 标记逾期并记日志', async () => {
    const qb = mockQueryBuilder({
      execute: jest.fn().mockResolvedValue({ affected: 3 }),
    });
    const repo = mockRepository({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });
    const service = new FeeScheduleService(repo as unknown as Repository<Fee>);
    const logSpy = jest
      .spyOn(service['logger'], 'log')
      .mockImplementation(() => undefined);

    await service.detectOverdue();

    expect(qb.update).toHaveBeenCalledWith(Fee);
    expect(qb.set).toHaveBeenCalledWith({ payStatus: 'overdue' });
    expect(qb.andWhere).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3 条费用'));
    logSpy.mockRestore();
  });

  it('affected=0 → 不记日志', async () => {
    const qb = mockQueryBuilder({
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    });
    const repo = mockRepository({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });
    const service = new FeeScheduleService(repo as unknown as Repository<Fee>);
    const logSpy = jest
      .spyOn(service['logger'], 'log')
      .mockImplementation(() => undefined);

    await service.detectOverdue();

    expect(qb.update).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
