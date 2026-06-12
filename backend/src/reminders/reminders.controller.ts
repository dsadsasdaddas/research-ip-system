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
} from '@nestjs/common';
import { RemindersService, ReminderTaskListQuery } from './reminders.service';
import { CreateReminderTaskDto } from './dto/create-reminder-task.dto';
import { CreateReminderRuleDto } from './dto/create-reminder-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';

@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private svc: RemindersService) {}

  // ===== 任务 =====
  @Get('tasks')
  listTasks(
    @Query('keyword') keyword?: string,
    @Query('remindLevel') remindLevel?: string,
    @Query('isConfirm') isConfirm?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const query: ReminderTaskListQuery = {
      keyword,
      remindLevel,
      isConfirm,
      deptId,
    };
    return this.svc.listTasks(query);
  }

  @Get('tasks/summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.svc.summary(user);
  }

  @Post('tasks')
  createTask(
    @Body() dto: CreateReminderTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.createTask(dto, user);
  }

  @Patch('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body() dto: Partial<CreateReminderTaskDto>,
  ) {
    return this.svc.updateTask(+id, dto);
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string) {
    return this.svc.deleteTask(+id);
  }

  @Post('tasks/:id/confirm')
  confirmTask(@Param('id') id: string) {
    return this.svc.confirmTask(+id);
  }

  @Post('tasks/check-second-remind')
  checkSecondRemind() {
    return this.svc.checkSecondRemind();
  }

  // ===== 规则 =====
  @Get('rules')
  listRules() {
    return this.svc.listRules();
  }

  @Post('rules')
  createRule(@Body() dto: CreateReminderRuleDto) {
    return this.svc.createRule(dto);
  }

  @Patch('rules/:id')
  updateRule(
    @Param('id') id: string,
    @Body() dto: Partial<CreateReminderRuleDto>,
  ) {
    return this.svc.updateRule(+id, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.svc.deleteRule(+id);
  }
}
