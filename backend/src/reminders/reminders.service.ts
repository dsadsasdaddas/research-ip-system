import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderTask } from './entities/reminder-task.entity';
import { ReminderRule } from './entities/reminder-rule.entity';
import { CreateReminderTaskDto } from './dto/create-reminder-task.dto';
import { CreateReminderRuleDto } from './dto/create-reminder-rule.dto';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';

export interface ReminderSummary {
  total: number;
  pending: number;
  overdue: number;
  urgent: number;
  secondRemind: number;
}

export interface ReminderTaskListQuery {
  keyword?: string;
  remindLevel?: string;
  isConfirm?: string;
  deptId?: number | null;
}

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(ReminderTask) private taskRepo: Repository<ReminderTask>,
    @InjectRepository(ReminderRule) private ruleRepo: Repository<ReminderRule>,
  ) {}

  // ===== 提醒任务 =====

  async listTasks(query: ReminderTaskListQuery): Promise<ReminderTask[]> {
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .orderBy('t.remind_date', 'ASC');
    if (query.keyword)
      qb.andWhere('t.title LIKE :kw', { kw: `%${query.keyword}%` });
    if (query.remindLevel)
      qb.andWhere('t.remind_level = :lvl', { lvl: query.remindLevel });
    if (query.isConfirm !== undefined && query.isConfirm !== '') {
      qb.andWhere('t.is_confirm = :ic', { ic: query.isConfirm === 'true' });
    }
    if (query.deptId != null)
      qb.andWhere('t.dept_id = :did', { did: query.deptId });
    return qb.getMany();
  }

  async createTask(
    dto: CreateReminderTaskDto,
    user: AuthUser,
  ): Promise<ReminderTask> {
    return this.taskRepo.save(
      this.taskRepo.create({
        ...dto,
        receiverName: dto.receiverName ?? user.username,
        deptId: dto.deptId ?? user.deptId ?? null,
      }),
    );
  }

  async updateTask(
    id: number,
    dto: Partial<CreateReminderTaskDto>,
  ): Promise<ReminderTask | null> {
    await this.taskRepo.update(id, dto);
    return this.taskRepo.findOneBy({ id });
  }

  async deleteTask(id: number): Promise<{ success: boolean }> {
    await this.taskRepo.delete(id);
    return { success: true };
  }

  async confirmTask(id: number): Promise<ReminderTask | null> {
    await this.taskRepo.update(id, {
      isConfirm: true,
      confirmTime: new Date(),
    });
    return this.taskRepo.findOneBy({ id });
  }

  async checkSecondRemind(): Promise<{ secondReminded: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks = await this.taskRepo.find({
      where: { isConfirm: false, secondRemindSent: false },
    });
    const toUpdate: number[] = [];
    for (const t of tasks) {
      if (!t.deadline) continue;
      const dl = new Date(t.deadline);
      dl.setHours(0, 0, 0, 0);
      if (dl <= today) toUpdate.push(t.id);
    }
    if (toUpdate.length > 0) {
      await this.taskRepo
        .createQueryBuilder()
        .update()
        .set({ secondRemindSent: true, secondRemindTime: new Date() })
        .whereInIds(toUpdate)
        .execute();
    }
    return { secondReminded: toUpdate.length };
  }

  async summary(user: AuthUser): Promise<ReminderSummary> {
    const deptId = getDeptFilter(user);
    const qb = this.taskRepo.createQueryBuilder('t');
    if (deptId != null) qb.andWhere('t.dept_id = :did', { did: deptId });
    const all = await qb.getMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let pending = 0,
      overdue = 0,
      urgent = 0,
      secondRemind = 0;
    for (const t of all) {
      if (!t.isConfirm) {
        pending++;
        if (t.deadline && new Date(t.deadline) < today) overdue++;
        if (t.remindLevel === '紧急') urgent++;
        if (t.secondRemindSent) secondRemind++;
      }
    }
    return { total: all.length, pending, overdue, urgent, secondRemind };
  }

  // ===== 提醒规则 =====

  async listRules(): Promise<ReminderRule[]> {
    return this.ruleRepo.find({ order: { createTime: 'DESC' } });
  }

  async createRule(dto: CreateReminderRuleDto): Promise<ReminderRule> {
    return this.ruleRepo.save(this.ruleRepo.create(dto));
  }

  async updateRule(
    id: number,
    dto: Partial<CreateReminderRuleDto>,
  ): Promise<ReminderRule | null> {
    await this.ruleRepo.update(id, dto);
    return this.ruleRepo.findOneBy({ id });
  }

  async deleteRule(id: number): Promise<{ success: boolean }> {
    await this.ruleRepo.delete(id);
    return { success: true };
  }
}
