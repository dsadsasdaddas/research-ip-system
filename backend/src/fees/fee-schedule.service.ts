import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Fee } from './entities/fee.entity';

@Injectable()
export class FeeScheduleService {
  private readonly logger = new Logger(FeeScheduleService.name);

  constructor(
    @InjectRepository(Fee) private feeRepo: Repository<Fee>,
  ) {}

  /** 每天早上 8 点检测逾期费用 */
  @Cron('0 8 * * *')
  async detectOverdue(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.feeRepo
      .createQueryBuilder()
      .update(Fee)
      .set({ payStatus: 'overdue' })
      .where("pay_status = 'pending'")
      .andWhere('due_date < :today', { today })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`已将 ${result.affected} 条费用标记为逾期 (due_date < ${today})`);
    }
  }
}
