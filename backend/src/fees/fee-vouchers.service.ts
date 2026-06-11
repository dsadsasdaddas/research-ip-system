import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeeVoucher } from './entities/fee-voucher.entity';
import { CreateFeeVoucherDto } from './dto/create-fee-voucher.dto';

@Injectable()
export class FeeVouchersService {
  constructor(
    @InjectRepository(FeeVoucher)
    private readonly repo: Repository<FeeVoucher>,
  ) {}

  async create(dto: CreateFeeVoucherDto): Promise<FeeVoucher> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  findByPaymentRecord(recordId: number): Promise<FeeVoucher[]> {
    return this.repo.find({
      where: { paymentRecordId: recordId },
      order: { createTime: 'DESC' },
    });
  }
}
