import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { FeesService, FeeListQuery, PatentForPlan } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { CreateFeePaymentDto } from './dto/create-fee-payment.dto';
import { UpdateFinanceStatusDto } from './dto/update-finance-status.dto';
import { CreateFeeVoucherDto } from './dto/create-fee-voucher.dto';
import { FeePlansService } from './fee-plans.service';
import { FeePaymentsService } from './fee-payments.service';
import { FeeVouchersService } from './fee-vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';

@UseGuards(JwtAuthGuard)
@Controller('fees')
export class FeesController {
  constructor(
    private readonly svc: FeesService,
    private readonly plansSvc: FeePlansService,
    private readonly paymentsSvc: FeePaymentsService,
    private readonly vouchersSvc: FeeVouchersService,
  ) {}

  @Post()
  create(@Body() dto: CreateFeeDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user);
  }

  @Get()
  findAll(
    @Query('keyword')      keyword?: string,
    @Query('relationType') relationType?: string,
    @Query('payStatus')    payStatus?: string,
    @Query('alertLevel')   alertLevel?: string,
    @CurrentUser()         user?: AuthUser,
  ) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const query: FeeListQuery = { keyword, relationType, payStatus, alertLevel, deptId };
    return this.svc.findAll(query);
  }

  @Get('alert-summary')
  alertSummary(@CurrentUser() user: AuthUser) {
    return this.svc.alertSummary(user);
  }

  /** generate-plans 必须在 :id 路由之前，避免被参数路由捕获 */
  @Post('generate-plans')
  @UseGuards(RolesGuard)
  @Roles('dept_admin', 'sys_admin', 'dept_secretary')
  generatePlans(@Body('patents') patents: PatentForPlan[], @CurrentUser() user: AuthUser) {
    return this.svc.generatePlansFromPatents(patents ?? [], user);
  }

  // ========== 缴费计划嵌套路由 (必须在 :id 路由之前) ==========

  @Get(':feeId/plans')
  listPlans(@Param('feeId', ParseIntPipe) feeId: number) {
    return this.plansSvc.findByFee(feeId);
  }

  @Post(':feeId/plans')
  createPlan(@Param('feeId', ParseIntPipe) feeId: number, @Body() dto: CreateFeePlanDto) {
    return this.plansSvc.create({ ...dto, feeId });
  }

  // ========== 缴费记录嵌套路由 (必须在 :id 路由之前) ==========

  @Get(':feeId/payments')
  listPayments(@Param('feeId', ParseIntPipe) feeId: number) {
    return this.paymentsSvc.findByFee(feeId);
  }

  @Post(':feeId/payments')
  createPayment(@Param('feeId', ParseIntPipe) feeId: number, @Body() dto: CreateFeePaymentDto) {
    return this.paymentsSvc.create(feeId, dto);
  }

  // ========== 主资源 CRUD ==========

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeeDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}

/**
 * 独立控制器：缴费计划更新/删除、缴费记录财务状态更新、凭证管理。
 */
@UseGuards(JwtAuthGuard)
@Controller('fee-plans')
export class FeePlansController {
  constructor(private readonly plansSvc: FeePlansService) {}

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateFeePlanDto) {
    return this.plansSvc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.plansSvc.remove(id);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('fee-payments')
export class FeePaymentsController {
  constructor(
    private readonly paymentsSvc: FeePaymentsService,
    private readonly vouchersSvc: FeeVouchersService,
  ) {}

  @Patch(':id/finance-status')
  updateFinanceStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFinanceStatusDto) {
    return this.paymentsSvc.updateFinanceStatus(id, dto);
  }

  @Post(':paymentId/vouchers')
  createVoucher(@Param('paymentId', ParseIntPipe) paymentId: number, @Body() dto: CreateFeeVoucherDto) {
    return this.vouchersSvc.create({ ...dto, paymentRecordId: paymentId });
  }
}
