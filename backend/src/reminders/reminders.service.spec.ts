import { RemindersService } from './reminders.service';
import {
  mockRepository,
  mockQueryBuilder,
  mockAuthUser,
} from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { ReminderTask } from './entities/reminder-task.entity';
import type { ReminderRule } from './entities/reminder-rule.entity';
import { UserRole } from '../users/entities/user.entity';

function dayOffset(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('RemindersService', () => {
  let service: RemindersService;
  let taskRepo: ReturnType<typeof mockRepository>;
  let ruleRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    taskRepo = mockRepository();
    ruleRepo = mockRepository();
    service = new RemindersService(
      taskRepo as unknown as Repository<ReminderTask>,
      ruleRepo as unknown as Repository<ReminderRule>,
    );
  });

  function withTaskQb(terminal: Record<string, jest.Mock>) {
    const qb = mockQueryBuilder(terminal);
    taskRepo = mockRepository({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });
    service = new RemindersService(
      taskRepo as unknown as Repository<ReminderTask>,
      ruleRepo as unknown as Repository<ReminderRule>,
    );
    return qb;
  }

  describe('listTasks', () => {
    it('全部过滤条件触发', async () => {
      const qb = withTaskQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.listTasks({
        keyword: 'kw',
        remindLevel: '紧急',
        isConfirm: 'true',
        deptId: 5,
      });
      expect(qb.andWhere).toHaveBeenCalledTimes(4);
      expect(qb.orderBy).toHaveBeenCalledWith('t.remind_date', 'ASC');
    });

    it('isConfirm=false 字符串 → ic=false', async () => {
      const qb = withTaskQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.listTasks({ isConfirm: 'false' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.is_confirm = :ic', {
        ic: false,
      });
    });

    it('isConfirm 为空字符串 → 不加该条件', async () => {
      const qb = withTaskQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.listTasks({ isConfirm: '' });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('无任何条件 → 直接 getMany', async () => {
      const qb = withTaskQb({
        getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      });
      const out = await service.listTasks({});
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(out).toEqual([{ id: 1 }]);
    });

    it('deptId=null → 不加 dept 条件', async () => {
      const qb = withTaskQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.listTasks({ deptId: null });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('createTask', () => {
    it('dto 缺 receiverName/deptId → 用 user 兜底', async () => {
      taskRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createTask(
        { title: 't' },
        mockAuthUser(UserRole.DEPT_ADMIN, 5),
      );
      const created = taskRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.receiverName).toBe('test');
      expect(created.deptId).toBe(5);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('dto 显式 receiverName/deptId → 保留', async () => {
      taskRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createTask(
        { title: 't', receiverName: 'bob', deptId: 9 },
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      const created = taskRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.receiverName).toBe('bob');
      expect(created.deptId).toBe(9);
    });

    it('user.deptId 为 null 且 dto 无 deptId → deptId=null', async () => {
      taskRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createTask(
        { title: 't' },
        mockAuthUser(UserRole.RESEARCHER, null),
      );
      const created = taskRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.deptId).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('update 后回查', async () => {
      taskRepo.findOneBy.mockResolvedValue({ id: 1 });
      const out = await service.updateTask(1, { title: 'n' });
      expect(taskRepo.update).toHaveBeenCalledWith(1, { title: 'n' });
      expect(out).toEqual({ id: 1 });
    });
  });

  describe('deleteTask', () => {
    it('删除并返回 success', async () => {
      await expect(service.deleteTask(1)).resolves.toEqual({ success: true });
      expect(taskRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('confirmTask', () => {
    it('更新 isConfirm+confirmTime 后回查', async () => {
      taskRepo.findOneBy.mockResolvedValue({ id: 1 });
      const out = await service.confirmTask(1);
      expect(taskRepo.update).toHaveBeenCalledWith(1, {
        isConfirm: true,
        confirmTime: expect.any(Date),
      });
      expect(out).toEqual({ id: 1 });
    });
  });

  describe('checkSecondRemind', () => {
    it('无符合条件任务 → 返回 0,不执行 update', async () => {
      taskRepo.find.mockResolvedValue([]);
      const out = await service.checkSecondRemind();
      expect(out).toEqual({ secondReminded: 0 });
      expect(taskRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('任务无 deadline → 跳过', async () => {
      taskRepo.find.mockResolvedValue([{ id: 1, deadline: null }]);
      const out = await service.checkSecondRemind();
      expect(out).toEqual({ secondReminded: 0 });
    });

    it('deadline 未来 → 不更新', async () => {
      taskRepo.find.mockResolvedValue([{ id: 1, deadline: dayOffset(5) }]);
      const out = await service.checkSecondRemind();
      expect(out).toEqual({ secondReminded: 0 });
    });

    it('deadline 已过/今天 → 批量更新', async () => {
      const qb = mockQueryBuilder({
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
        whereInIds: jest.fn().mockReturnThis(),
      });
      taskRepo = mockRepository({
        find: jest.fn().mockResolvedValue([
          { id: 1, deadline: dayOffset(-3) },
          { id: 2, deadline: dayOffset(0) }, // 今天,dl <= today
        ]),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      service = new RemindersService(
        taskRepo as unknown as Repository<ReminderTask>,
        ruleRepo as unknown as Repository<ReminderRule>,
      );
      const out = await service.checkSecondRemind();
      expect(out).toEqual({ secondReminded: 2 });
      expect(qb.update).toHaveBeenCalled();
      expect(qb.set).toHaveBeenCalledWith({
        secondRemindSent: true,
        secondRemindTime: expect.any(Date),
      });
      expect(qb.whereInIds).toHaveBeenCalledWith([1, 2]);
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('全院用户:不加 dept 过滤,统计各项', async () => {
      const qb = withTaskQb({
        getMany: jest.fn().mockResolvedValue([
          {
            isConfirm: false,
            deadline: dayOffset(-1),
            remindLevel: '紧急',
            secondRemindSent: true,
          }, // pending+overdue+urgent+secondRemind
          {
            isConfirm: false,
            deadline: dayOffset(5),
            remindLevel: '普通',
            secondRemindSent: false,
          }, // pending only
          {
            isConfirm: true,
            deadline: dayOffset(-1),
            remindLevel: '紧急',
            secondRemindSent: true,
          }, // 已确认 → 不计入
        ]),
      });
      const out = await service.summary(mockAuthUser(UserRole.SYS_ADMIN));
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(out).toEqual({
        total: 3,
        pending: 2,
        overdue: 1,
        urgent: 1,
        secondRemind: 1,
      });
    });

    it('部门隔离用户:加 dept 条件', async () => {
      const qb = withTaskQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.summary(mockAuthUser(UserRole.DEPT_SEC, 7));
      expect(qb.andWhere).toHaveBeenCalledWith('t.dept_id = :did', { did: 7 });
    });

    it('未确认但无 deadline → 不计 overdue', async () => {
      withTaskQb({
        getMany: jest.fn().mockResolvedValue([
          {
            isConfirm: false,
            deadline: null,
            remindLevel: '普通',
            secondRemindSent: false,
          },
        ]),
      });
      const out = await service.summary(mockAuthUser(UserRole.SYS_ADMIN));
      expect(out).toEqual({
        total: 1,
        pending: 1,
        overdue: 0,
        urgent: 0,
        secondRemind: 0,
      });
    });
  });

  describe('rules', () => {
    it('listRules 按 createTime DESC', async () => {
      await service.listRules();
      expect(ruleRepo.find).toHaveBeenCalledWith({
        order: { createTime: 'DESC' },
      });
    });

    it('createRule', async () => {
      ruleRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createRule({ title: 'r' });
      expect(ruleRepo.save).toHaveBeenCalled();
    });

    it('updateRule', async () => {
      ruleRepo.findOneBy.mockResolvedValue({ id: 1 });
      const out = await service.updateRule(1, { daysBefore: 10 });
      expect(ruleRepo.update).toHaveBeenCalledWith(1, { daysBefore: 10 });
      expect(out).toEqual({ id: 1 });
    });

    it('deleteRule', async () => {
      await expect(service.deleteRule(1)).resolves.toEqual({ success: true });
      expect(ruleRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
