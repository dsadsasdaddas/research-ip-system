import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { DepartmentsService } from './departments.service';
import { mockRepository } from '../testing/mocks';
import type { Department } from './entities/department.entity';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository({
      create: jest
        .fn()
        .mockImplementation((dto: unknown) => ({ ...(dto as object) })),
      save: jest
        .fn()
        .mockImplementation((e: unknown) =>
          Promise.resolve({ id: 1, ...(e as object) }),
        ),
    });
    service = new DepartmentsService(repo as unknown as Repository<Department>);
  });

  describe('findAll', () => {
    it('无 keyword → 空条件、按 id ASC', async () => {
      repo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const res = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { id: 'ASC' },
      });
      expect(res).toHaveLength(2);
    });

    it('有 keyword → Like 模糊查询', async () => {
      repo.find.mockResolvedValue([{ id: 1 }]);
      await service.findAll('计算机');
      const call = repo.find.mock.calls[0][0] as {
        where: { name: { _value: string; _type: string } };
      };
      // Like(`%计算机%`) 产出的 FindOperator 对象
      expect(call.where.name._type).toBe('like');
      expect(call.where.name._value).toBe('%计算机%');
    });

    it('keyword 为空串 → 走无条件分支', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll('');
      expect((repo.find.mock.calls[0][0] as { where: object }).where).toEqual(
        {},
      );
    });
  });

  describe('findOne', () => {
    it('找到 → 返回', async () => {
      repo.findOne.mockResolvedValue({ id: 1, name: 'a' });
      await expect(service.findOne(1)).resolves.toEqual({ id: 1, name: 'a' });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
    it('未找到 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('名称已存在 → 409', async () => {
      repo.findOne.mockResolvedValue({ id: 1 }); // ensureNameAvailable 命中
      await expect(service.create({ name: 'a' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('指定 parentId 但父部门不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null); // 名称可用 + 父部门不存在
      await expect(
        service.create({ name: 'a', parentId: 9 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('无 parentId → 不校验父级,落 parentId=null', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = await service.create({ name: 'a' });
      const arg = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.parentId).toBeNull();
      expect(arg.description).toBeNull();
      expect(created.id).toBe(1);
    });

    it('parentId 显式 null → 跳过父级校验', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.create({
        name: 'a',
        parentId: null,
        description: 'd',
      });
      const arg = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.parentId).toBeNull();
      expect(arg.description).toBe('d');
      // findOne 只被调一次(名称检查),父级未查
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('父级存在 → 正常创建', async () => {
      repo.findOne
        .mockResolvedValueOnce(null) // 名称可用
        .mockResolvedValueOnce({ id: 5 }); // 父部门存在
      const created = await service.create({ name: 'a', parentId: 5 });
      const arg = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.parentId).toBe(5);
      expect(created.id).toBe(1);
    });
  });

  describe('update', () => {
    it('部门不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('改名为已存在的名称 → 409', async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: 1, name: 'old' }) // findOne(id)
        .mockResolvedValueOnce({ id: 2 }); // ensureNameAvailable 命中
      await expect(service.update(1, { name: 'taken' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('改为同名(未变化)→ 不校验唯一性', async () => {
      const dept = { id: 1, name: 'same' };
      repo.findOne.mockResolvedValue(dept);
      await service.update(1, { name: 'same' });
      expect(repo.findOne).toHaveBeenCalledTimes(1); // 只查自身,未查重
      expect(repo.save).toHaveBeenCalled();
    });

    it('parentId 等于自己 → 400', async () => {
      repo.findOne.mockResolvedValue({ id: 1, name: 'a' });
      await expect(service.update(1, { parentId: 1 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('指定不存在的 parentId → 404', async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: 1, name: 'a' }) // findOne(id)
        .mockResolvedValueOnce(null); // 父部门不存在
      await expect(service.update(1, { parentId: 9 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('parentId 合法 + 改名 + 改描述 → 合并保存', async () => {
      const dept = { id: 1, name: 'old', parentId: null, description: null };
      repo.findOne
        .mockResolvedValueOnce(dept) // findOne(id)
        .mockResolvedValueOnce(null) // ensureNameAvailable(新名) → 名称可用
        .mockResolvedValueOnce({ id: 5 }); // 父部门存在
      await service.update(1, {
        name: 'new',
        parentId: 5,
        description: 'd',
      });
      expect(dept.name).toBe('new');
      expect(dept.parentId).toBe(5);
      expect(dept.description).toBe('d');
      expect(repo.save).toHaveBeenCalled();
    });

    it('parentId 为 null → 不进入父级校验分支', async () => {
      const dept = { id: 1, name: 'a', parentId: 9 };
      repo.findOne.mockResolvedValue(dept);
      await service.update(1, { parentId: null });
      expect(dept.parentId).toBeNull();
    });
  });

  describe('remove', () => {
    it('部门不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('存在下级部门 → 400', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      repo.count.mockResolvedValue(3);
      await expect(service.remove(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.count).toHaveBeenCalledWith({ where: { parentId: 1 } });
    });

    it('无下级 → 删除成功', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      repo.count.mockResolvedValue(0);
      await expect(service.remove(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(repo.remove).toHaveBeenCalled();
    });
  });
});
