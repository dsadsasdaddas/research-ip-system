import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { FeesService, FeeListQuery, PatentForPlan } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';

@UseGuards(JwtAuthGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly svc: FeesService) {}

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
