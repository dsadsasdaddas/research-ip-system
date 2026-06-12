import { NotFoundException } from '@nestjs/common';
import { FeePaymentsService } from './fee-payments.service';
import { mockRepository, mockQueryBuilder } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { FeePaymentRecord } from './entities/fee-payment-record.entity';
import type { Fee } from './entities/fee.entity';

describe('FeePaymentsService', () => {
  let service: FeePaymentsService;
  let repo: ReturnType<typeof mockRepository>;
  let feeRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository();
    feeRepo = mockRepository();
    service = new FeePaymentsService(
      repo as unknown as Repository<FeePaymentRecord>,
      feeRepo as unknown as Repository<Fee>,
    );
  });

  describe('create', () => {
    it('fee 不存在 → 仅保存记录,不更新状态', async () => {
      repo.save.mockImplementation((e: unknown) => Promise.resolve(e));
      feeRepo.findOneBy.mockResolvedValue(null);
      const out = await service.create(1, {
        paymentAmount: 100,
        paymentDate: '2030-01-01',
      });
      expect(feeRepo.update).not.toHaveBeenCalled();
      expect((out as Record<string, unknown>).feeId).toBe(1);
    });

    it('累计缴费 < 金额 → 不更新为 paid', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ total: 50 }),
      });
      repo = mockRepository({
        save: jest.fn().mockImplementation((e: unknown) => Promise.resolve(e)),
        create: jest
          .fn()
          .mockImplementation((dto: unknown) => ({ ...(dto as object) })),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      feeRepo = mockRepository({
        findOneBy: jest.fn().mockResolvedValue({ id: 1, amount: 100 }),
      });
      service = new FeePaymentsService(
        repo as unknown as Repository<FeePaymentRecord>,
        feeRepo as unknown as Repository<Fee>,
      );
      await service.create(1, {
        paymentAmount: 50,
        paymentDate: '2030-01-01',
      });
      expect(feeRepo.update).not.toHaveBeenCalled();
    });

    it('累计缴费 >= 金额 → 更新 fee 为 paid', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ total: '150' }),
      });
      repo = mockRepository({
        save: jest.fn().mockImplementation((e: unknown) => Promise.resolve(e)),
        create: jest
          .fn()
          .mockImplementation((dto: unknown) => ({ ...(dto as object) })),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      feeRepo = mockRepository({
        findOneBy: jest.fn().mockResolvedValue({ id: 1, amount: 100 }),
      });
      service = new FeePaymentsService(
        repo as unknown as Repository<FeePaymentRecord>,
        feeRepo as unknown as Repository<Fee>,
      );
      await service.create(1, {
        paymentAmount: 150,
        paymentDate: '2030-01-01',
      });
      expect(feeRepo.update).toHaveBeenCalledWith(1, { payStatus: 'paid' });
    });

    it('fee.amount 为 null → 不更新', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({ total: 150 }),
      });
      repo = mockRepository({
        save: jest.fn().mockImplementation((e: unknown) => Promise.resolve(e)),
        create: jest
          .fn()
          .mockImplementation((dto: unknown) => ({ ...(dto as object) })),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      feeRepo = mockRepository({
        findOneBy: jest.fn().mockResolvedValue({ id: 1, amount: null }),
      });
      service = new FeePaymentsService(
        repo as unknown as Repository<FeePaymentRecord>,
        feeRepo as unknown as Repository<Fee>,
      );
      await service.create(1, {
        paymentAmount: 150,
        paymentDate: '2030-01-01',
      });
      expect(feeRepo.update).not.toHaveBeenCalled();
    });

    it('totalPaid 为 null/undefined → sum 取 0', async () => {
      const qb = mockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue(null),
      });
      repo = mockRepository({
        save: jest.fn().mockImplementation((e: unknown) => Promise.resolve(e)),
        create: jest
          .fn()
          .mockImplementation((dto: unknown) => ({ ...(dto as object) })),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      feeRepo = mockRepository({
        findOneBy: jest.fn().mockResolvedValue({ id: 1, amount: 100 }),
      });
      service = new FeePaymentsService(
        repo as unknown as Repository<FeePaymentRecord>,
        feeRepo as unknown as Repository<Fee>,
      );
      await service.create(1, {
        paymentAmount: 50,
        paymentDate: '2030-01-01',
      });
      expect(feeRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('findByFee', () => {
    it('按 createTime DESC', async () => {
      await service.findByFee(3);
      expect(repo.find).toHaveBeenCalledWith({
        where: { feeId: 3 },
        order: { createTime: 'DESC' },
      });
    });
  });

  describe('updateFinanceStatus', () => {
    it('不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(
        service.updateFinanceStatus(1, { financeStatus: 'confirmed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('仅 financeStatus', async () => {
      const e = { id: 1, financeStatus: 'pending', financeVoucherNo: null };
      repo.findOneBy.mockResolvedValue(e);
      await service.updateFinanceStatus(1, {
        financeStatus: 'confirmed',
      });
      expect((e as Record<string, unknown>).financeStatus).toBe('confirmed');
      expect(repo.save).toHaveBeenCalledWith(e);
    });

    it('带 financeVoucherNo → 同时更新', async () => {
      const e = { id: 1, financeStatus: 'pending', financeVoucherNo: null };
      repo.findOneBy.mockResolvedValue(e);
      await service.updateFinanceStatus(1, {
        financeStatus: 'confirmed',
        financeVoucherNo: 'V001',
      });
      expect((e as Record<string, unknown>).financeVoucherNo).toBe('V001');
    });
  });
});
