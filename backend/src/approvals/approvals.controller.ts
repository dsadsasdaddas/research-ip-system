import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateNodeDto } from './dto/create-node.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ApproveActionDto } from './dto/approve-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}

  // ==================== 流程定义 CRUD (管理员) ====================

  @Post('flows')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  createFlow(@Body() dto: CreateFlowDto) {
    return this.svc.createFlow(dto);
  }

  @Get('flows')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  findAllFlows(@Query('businessType') businessType?: string) {
    return this.svc.findAllFlows(businessType);
  }

  @Get('flows/:id')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  findOneFlow(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOneFlow(id);
  }

  @Patch('flows/:id')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  updateFlow(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFlowDto) {
    return this.svc.updateFlow(id, dto);
  }

  @Delete('flows/:id')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  removeFlow(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeFlow(id);
  }

  // ==================== 流程节点 CRUD (管理员) ====================

  @Post('flows/:flowId/nodes')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  addNode(@Param('flowId', ParseIntPipe) flowId: number, @Body() dto: CreateNodeDto) {
    return this.svc.addNode(flowId, dto);
  }

  @Patch('nodes/:id')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  updateNode(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateNodeDto>) {
    return this.svc.updateNode(id, dto);
  }

  @Delete('nodes/:id')
  @UseGuards(RolesGuard)
  @Roles('sys_admin')
  removeNode(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeNode(id);
  }

  // ==================== 审批实例操作 ====================

  @Post('submit')
  submitForApproval(@Body() dto: SubmitApprovalDto, @CurrentUser() user: AuthUser) {
    return this.svc.submitForApproval(dto, user);
  }

  @Get('my-pending')
  findMyPending(@CurrentUser() user: AuthUser) {
    return this.svc.findMyPending(user);
  }

  @Get('my-submitted')
  findMySubmitted(@CurrentUser() user: AuthUser) {
    return this.svc.findMySubmitted(user);
  }

  @Get('instances/:id')
  getInstanceDetail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getInstanceDetail(id);
  }

  @Post('instances/:id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('nodeId', ParseIntPipe) nodeId: number,
    @Body() dto: ApproveActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.approve(id, nodeId, dto, user);
  }

  @Post('instances/:id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('nodeId', ParseIntPipe) nodeId: number,
    @Body() dto: ApproveActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.reject(id, nodeId, dto, user);
  }

  @Post('instances/:id/return')
  returnToPrevious(
    @Param('id', ParseIntPipe) id: number,
    @Body('nodeId', ParseIntPipe) nodeId: number,
    @Body() dto: ApproveActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.returnToPrevious(id, nodeId, dto, user);
  }

  @Post('instances/:id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.svc.cancel(id, user);
  }
}
