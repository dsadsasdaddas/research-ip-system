import { FeesService } from './fees.service';
import {
  mockRepository,
  mockQueryBuilder,
  mockAuthUser,
} from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { Fee } from './entities/fee.entity';
import { UserRole } from '../users/entities/user.entity';

// 相对今天的日期偏移(天),返回 YYYY-MM-DD;便于稳定触发各预警等级分支
function dayOffset(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('FeesService', () => {
  let service: FeesService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository();
    service = new FeesService(repo as unknown as Repository<Fee>);
  });

  function withQb(terminal: Record<string, jest.Mock>) {
    const qb = mockQueryBuilder(terminal);
    repo = mockRepository({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });
    service = new FeesService(repo as unknown as Repository<Fee>);
    return qb;
  }

  describe('create', () => {
    it('忽略前端 deptId,注入 user.deptId + 默认 payStatus=pending', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.create(
        { deptId: 999, relationName: 'n' },
        mockAuthUser(UserRole.DEPT_ADMIN, 5),
      );
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.deptId).toBe(5);
      expect(created.createUser).toBe('test');
      expect(created.payStatus).toBe('pending');
      // 忽略前端 deptId 不进实体
      expect(created).not.toHaveProperty('ignoredDeptId');
      expect(out.alertLevel).toBe(0); // 无 dueDate + pending → 0
    });

    it('显式 payStatus 保留 + user.deptId 为 null 时 deptId=null', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.create(
        { payStatus: 'paid', dueDate: dayOffset(-5) },
        mockAuthUser(UserRole.RESEARCHER, null),
      );
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.payStatus).toBe('paid');
      expect(created.deptId).toBeNull();
    });
  });

  describe('findAll', () => {
    it('全条件:keyword + relationType + payStatus + deptId 全部加 where', async () => {
      const qb = withQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.findAll({
        keyword: 'kw',
        relationType: 'patent',
        payStatus: 'paid',
        deptId: 5,
      });
      expect(qb.andWhere).toHaveBeenCalledTimes(4);
      expect(qb.orderBy).toHaveBeenCalledWith('f.due_date', 'ASC');
    });

    it('无任何条件 → 不加 where,直接返回', async () => {
      const qb = withQb({ getMany: jest.fn().mockResolvedValue([{ id: 1 }]) });
      const out = await service.findAll({});
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(out).toHaveLength(1);
      expect(out[0].alertLevel).toBe(0);
    });

    it('alertLevel 过滤:只返回该等级', async () => {
      const qb = withQb({
        getMany: jest.fn().mockResolvedValue([
          { id: 1, dueDate: dayOffset(-1), payStatus: 'pending' }, // 4 overdue
          { id: 2, dueDate: dayOffset(5), payStatus: 'pending' }, // 3 day7
          { id: 3, dueDate: dayOffset(20), payStatus: 'pending' }, // 1 day30
        ]),
      });
      const out = await service.findAll({ alertLevel: '3' });
      expect(out.map((r) => r.id)).toEqual([2]);
    });

    it('alertLevel 为空字符串 → 不过滤', async () => {
      const qb = withQb({
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 1, dueDate: null, payStatus: 'pending' }]),
      });
      const out = await service.findAll({ alertLevel: '' });
      expect(out).toHaveLength(1);
    });

    it('deptId=null 不过滤(===null 被排除)', async () => {
      const qb = withQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.findAll({ deptId: null });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('calcAlertLevel (经由 findOne/withAlert)', () => {
    it('paid/cancelled → 0;无 dueDate → 0', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        dueDate: dayOffset(-1),
        payStatus: 'paid',
      });
      await expect(service.findOne(1)).resolves.toMatchObject({
        alertLevel: 0,
      });
      repo.findOneBy.mockResolvedValue({
        id: 2,
        dueDate: null,
        payStatus: 'pending',
      });
      await expect(service.findOne(2)).resolves.toMatchObject({
        alertLevel: 0,
      });
    });

    it('overdue(<0)→4;day7(<=7)→3;day15(<=15)→2;day30(<=30)→1;normal(>30)→0', async () => {
      const cases: Array<[number, number]> = [
        [-1, 4],
        [5, 3],
        [10, 2],
        [25, 1],
        [60, 0],
      ];
      for (const [off, lvl] of cases) {
        repo.findOneBy.mockResolvedValue({
          id: 1,
          dueDate: dayOffset(off),
          payStatus: 'pending',
        });
        const r = await service.findOne(1);
        expect(r?.alertLevel).toBe(lvl);
      }
    });

    it('findOne 不存在 → null', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne(1)).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('忽略前端 deptId,update 后回查', async () => {
      repo.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });
      repo.findOneBy.mockResolvedValue({
        id: 1,
        dueDate: null,
        payStatus: 'pending',
      });
      const out = await service.update(1, {
        deptId: 999,
        remark: 'r',
      });
      expect(repo.update).toHaveBeenCalledWith(1, { remark: 'r' });
      expect(out?.alertLevel).toBe(0);
    });
  });

  describe('remove', () => {
    it('删除并返回 success', async () => {
      await expect(service.remove(1)).resolves.toEqual({ success: true });
      expect(repo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('alertSummary', () => {
    it('全院用户:不加 dept 过滤,统计各等级', async () => {
      const qb = withQb({
        getMany: jest.fn().mockResolvedValue([
          { dueDate: dayOffset(-1), payStatus: 'pending' }, // overdue
          { dueDate: dayOffset(5), payStatus: 'pending' }, // day7
          { dueDate: dayOffset(60), payStatus: 'pending' }, // normal
        ]),
      });
      const out = await service.alertSummary(mockAuthUser(UserRole.SYS_ADMIN));
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(out).toMatchObject({ normal: 1, day7: 1, overdue: 1, total: 3 });
    });

    it('部门隔离用户:加 dept_id 条件', async () => {
      const qb = withQb({ getMany: jest.fn().mockResolvedValue([]) });
      await service.alertSummary(mockAuthUser(UserRole.RESEARCHER, 5));
      expect(qb.andWhere).toHaveBeenCalledWith('f.dept_id = :did', { did: 5 });
    });
  });

  describe('generatePlansFromPatents', () => {
    it('跳过无 nextFeeDate 的专利', async () => {
      const out = await service.generatePlansFromPatents(
        [
          { id: 1, name: 'p', nextFeeDate: '', feeAmount: 100, deptId: 5 },
        ] as never,
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(out).toEqual({ generated: 0 });
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('部门隔离用户跳过非本部门的专利', async () => {
      const out = await service.generatePlansFromPatents(
        [
          {
            id: 1,
            name: 'p',
            nextFeeDate: '2030-01-01',
            feeAmount: 100,
            deptId: 99,
          },
        ] as never,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(out).toEqual({ generated: 0 });
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('已存在相同 fee → 跳过不重复生成', async () => {
      repo.findOne.mockResolvedValue({ id: 9 });
      const out = await service.generatePlansFromPatents(
        [
          {
            id: 1,
            name: 'p',
            nextFeeDate: '2030-01-01',
            feeAmount: 100,
            deptId: 5,
          },
        ] as never,
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(out).toEqual({ generated: 0 });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('新专利 → 生成计划', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.generatePlansFromPatents(
        [
          {
            id: 1,
            name: 'p1',
            nextFeeDate: '2030-01-01',
            feeAmount: 100,
            deptId: 5,
          },
          {
            id: 2,
            name: 'p2',
            nextFeeDate: '2030-02-01',
            feeAmount: 200,
            deptId: 5,
          },
        ] as never,
        mockAuthUser(UserRole.SYS_ADMIN),
      );
      expect(out).toEqual({ generated: 2 });
      expect(repo.save).toHaveBeenCalledTimes(2);
      const first = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(first.feeType).toBe('年费');
      expect(first.relationType).toBe('patent');
      expect(first.payStatus).toBe('pending');
    });

    it('全院用户 + 部门隔离用户混合:全院用户为本部门专利也可生成(deptId 匹配走 generate)', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.generatePlansFromPatents(
        [
          {
            id: 1,
            name: 'p',
            nextFeeDate: '2030-01-01',
            feeAmount: 100,
            deptId: 99,
          },
        ] as never,
        mockAuthUser(UserRole.SYS_ADMIN), // 全院 → userDeptId=undefined → 不限制部门
      );
      expect(out).toEqual({ generated: 1 });
    });
  });
});
