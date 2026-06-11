import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fee } from './entities/fee.entity';
import { FeePlan } from './entities/fee-plan.entity';
import { FeePaymentRecord } from './entities/fee-payment-record.entity';
import { FeeVoucher } from './entities/fee-voucher.entity';
import { FeesService } from './fees.service';
import { FeePlansService } from './fee-plans.service';
import { FeePaymentsService } from './fee-payments.service';
import { FeeVouchersService } from './fee-vouchers.service';
import { FeeScheduleService } from './fee-schedule.service';
import { FeesController, FeePlansController, FeePaymentsController } from './fees.controller';
import { Patent } from '../patents/entities/patent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fee, FeePlan, FeePaymentRecord, FeeVoucher, Patent])],
  providers: [
    FeesService,
    FeePlansService,
    FeePaymentsService,
    FeeVouchersService,
    FeeScheduleService,
  ],
  controllers: [FeesController, FeePlansController, FeePaymentsController],
  exports: [FeesService, FeePlansService, FeePaymentsService, FeeVouchersService],
})
export class FeesModule {}
