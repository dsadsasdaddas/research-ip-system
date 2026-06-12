import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeePaymentRecord } from './entities/fee-payment-record.entity';
import { Fee } from './entities/fee.entity';
import { CreateFeePaymentDto } from './dto/create-fee-payment.dto';
import { UpdateFinanceStatusDto } from './dto/update-finance-status.dto';

@Injectable()
export class FeePaymentsService {
  constructor(
    @InjectRepository(FeePaymentRecord)
    private readonly repo: Repository<FeePaymentRecord>,
    @InjectRepository(Fee)
    private readonly feeRepo: Repository<Fee>,
  ) {}

  /**
   * 创建缴费记录。
   * 如果缴费金额覆盖了费用金额，自动将 fee 的 payStatus 更新为 paid。
   */
  async create(
    feeId: number,
    dto: CreateFeePaymentDto,
  ): Promise<FeePaymentRecord> {
    const entity = this.repo.create({ ...dto, feeId });
    const saved = await this.repo.save(entity);

    // 尝试更新费用状态为已缴
    const fee = await this.feeRepo.findOneBy({ id: feeId });
    if (fee) {
      // 累计该 fee 下所有缴费记录总额
      const totalPaid = await this.repo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.payment_amount), 0)', 'total')
        .where('r.fee_id = :feeId', { feeId })
        .getRawOne();

      const sum = Number(totalPaid?.total ?? 0);
      if (fee.amount != null && sum >= Number(fee.amount)) {
        await this.feeRepo.update(feeId, { payStatus: 'paid' });
      }
    }

    return saved;
  }

  findByFee(feeId: number): Promise<FeePaymentRecord[]> {
    return this.repo.find({ where: { feeId }, order: { createTime: 'DESC' } });
  }

  async updateFinanceStatus(
    id: number,
    dto: UpdateFinanceStatusDto,
  ): Promise<FeePaymentRecord> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`缴费记录 #${id} 不存在`);
    entity.financeStatus = dto.financeStatus;
    if (dto.financeVoucherNo !== undefined) {
      entity.financeVoucherNo = dto.financeVoucherNo;
    }
    return this.repo.save(entity);
  }
}
