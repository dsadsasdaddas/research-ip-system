import { NotFoundException } from '@nestjs/common';
import { PatentsService } from './patents.service';
import {
  mockRepository,
  mockQueryBuilder,
  mockAuthUser,
} from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { Patent } from './entities/patent.entity';
import { UserRole } from '../users/entities/user.entity';

describe('PatentsService', () => {
  let service: PatentsService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository();
    service = new PatentsService(repo as unknown as Repository<Patent>);
  });

  describe('create', () => {
    it('注入 deptId/createUser(忽略前端传入值)并保存', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.create(
        { name: '专利A', deptId: 999, createUser: 'hacker' },
        mockAuthUser(UserRole.SYS_ADMIN, 5),
      );
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.deptId).toBe(5); // 前端 deptId 被忽略
      expect(created.createUser).toBe('test');
      expect(repo.save).toHaveBeenCalled();
    });

    it('deptId 为 null 时保存为 null', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.create(
        { name: '专利B' },
        mockAuthUser(UserRole.RESEARCHER, null),
      );
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.deptId).toBeNull();
      expect(created.createUser).toBe('test');
    });
  });

  describe('findAll / exportResource (listQuery 分支)', () => {
    function withQb(terminal: Record<string, jest.Mock>) {
      const qb = mockQueryBuilder(terminal);
      repo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      service = new PatentsService(repo as unknown as Repository<Patent>);
      return qb;
    }

    it('sys_admin + 无 keyword:不加部门条件,但有密级条件', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });
      const res = await service.findAll({ keyword: undefined }, mockAuthUser());
      expect(res.items).toEqual([{ id: 1 }]);
      expect(res.total).toBe(1);
      expect(qb.orderBy).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalled(); // 密级条件始终加
    });

    it('researcher + keyword:加部门 + 密级 + 关键字(按 name)条件', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findAll(
        { keyword: 'kw' },
        mockAuthUser(UserRole.RESEARCHER, 5),
      );
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('exportResource 不分页,最多取 10000', async () => {
      const qb = withQb({
        getMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      });
      const rows = await service.exportResource(
        { keyword: 'x' },
        mockAuthUser(),
      );
      expect(qb.take).toHaveBeenCalledWith(10000);
      expect(rows).toHaveLength(2);
    });

    it('无 user 时 listQuery 走默认分支(部门 undefined / 密级仅公开)', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findAll({ keyword: undefined }, undefined);
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('无 user → 直接返回', async () => {
      const patent = { id: 1, secretLevel: '公开', deptId: 5 } as Patent;
      repo.findOne.mockResolvedValue(patent);
      await expect(service.findOne(1)).resolves.toBe(patent);
    });

    it('密级不在允许范围 → 404', async () => {
      repo.findOne.mockResolvedValue({ id: 1, secretLevel: '涉密', deptId: 5 });
      await expect(
        service.findOne(1, mockAuthUser(UserRole.RESEARCHER, 5)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('部门不匹配 → 404', async () => {
      repo.findOne.mockResolvedValue({ id: 1, secretLevel: '公开', deptId: 6 });
      await expect(
        service.findOne(1, mockAuthUser(UserRole.RESEARCHER, 5)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sys_admin 全院可看 → 返回', async () => {
      const patent = { id: 1, secretLevel: '涉密', deptId: 99 } as Patent;
      repo.findOne.mockResolvedValue(patent);
      await expect(
        service.findOne(1, mockAuthUser(UserRole.SYS_ADMIN)),
      ).resolves.toBe(patent);
    });

    it('secretLevel 为空按公开处理 + 部门匹配 → 返回', async () => {
      const patent = { id: 1, secretLevel: null, deptId: 5 } as Patent;
      repo.findOne.mockResolvedValue(patent);
      await expect(
        service.findOne(1, mockAuthUser(UserRole.RESEARCHER, 5)),
      ).resolves.toBe(patent);
    });
  });

  describe('update', () => {
    it('存在 → 合并(忽略 deptId/createUser)并保存', async () => {
      const patent = {
        id: 1,
        name: 'old',
        deptId: 5,
        createUser: 'u',
        secretLevel: '公开',
      };
      repo.findOne.mockResolvedValue(patent);
      await service.update(
        1,
        { name: 'new', deptId: 999, createUser: 'hacker' },
        mockAuthUser(UserRole.SYS_ADMIN, 5),
      );
      expect(repo.save).toHaveBeenCalled();
      expect((patent as Record<string, unknown>).name).toBe('new');
      expect((patent as Record<string, unknown>).deptId).toBe(5); // 未被前端覆盖
    });

    it('不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('存在 → 删除', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      await expect(service.remove(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(repo.remove).toHaveBeenCalled();
    });
    it('不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
