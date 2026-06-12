import { FeeVouchersService } from './fee-vouchers.service';
import { mockRepository } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { FeeVoucher } from './entities/fee-voucher.entity';

describe('FeeVouchersService', () => {
  let service: FeeVouchersService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository();
    service = new FeeVouchersService(repo as unknown as Repository<FeeVoucher>);
  });

  it('create: create + save', async () => {
    repo.create.mockImplementation((dto: unknown) => ({ ...(dto as object) }));
    const out = await service.create({
      paymentRecordId: 1,
      voucherNo: 'V1',
    });
    expect(repo.save).toHaveBeenCalled();
    expect((out as Record<string, unknown>).paymentRecordId).toBe(1);
  });

  it('findByPaymentRecord: 按 createTime DESC', async () => {
    await service.findByPaymentRecord(5);
    expect(repo.find).toHaveBeenCalledWith({
      where: { paymentRecordId: 5 },
      order: { createTime: 'DESC' },
    });
  });
});
