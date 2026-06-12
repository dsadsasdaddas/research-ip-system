import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { mockRepository, mockQueryBuilder } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { RbacRole } from './entities/rbac-role.entity';
import type { RbacPermission } from './entities/rbac-permission.entity';
import type { RbacRolePermission } from './entities/rbac-role-permission.entity';

describe('RbacService', () => {
  let service: RbacService;
  let roleRepo: ReturnType<typeof mockRepository>;
  let permRepo: ReturnType<typeof mockRepository>;
  let rpRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    roleRepo = mockRepository();
    permRepo = mockRepository();
    rpRepo = mockRepository();
    service = new RbacService(
      roleRepo as unknown as Repository<RbacRole>,
      permRepo as unknown as Repository<RbacPermission>,
      rpRepo as unknown as Repository<RbacRolePermission>,
    );
  });

  // ──── 角色 CRUD ────

  describe('findAllRoles', () => {
    it('按 id ASC 返回角色列表', async () => {
      roleRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const res = await service.findAllRoles();
      expect(res).toEqual([{ id: 1 }, { id: 2 }]);
      expect(roleRepo.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    });
  });

  describe('findOneRole', () => {
    it('存在 → 返回角色', async () => {
      roleRepo.findOneBy.mockResolvedValue({ id: 1, code: 'admin' });
      await expect(service.findOneRole(1)).resolves.toEqual({
        id: 1,
        code: 'admin',
      });
      expect(roleRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('不存在 → 404', async () => {
      roleRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOneRole(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createRole', () => {
    it('create + save', async () => {
      roleRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.createRole({ code: 'r1', name: 'R1' });
      expect(roleRepo.create).toHaveBeenCalledWith({ code: 'r1', name: 'R1' });
      expect(roleRepo.save).toHaveBeenCalled();
      expect(out).toMatchObject({ code: 'r1', name: 'R1' });
    });
  });

  describe('updateRole', () => {
    it('普通角色 → Object.assign 后保存', async () => {
      const role = { id: 1, name: 'old', isSystem: false };
      roleRepo.findOneBy.mockResolvedValue(role);
      const out = await service.updateRole(1, { name: 'new' });
      expect((role as Record<string, unknown>).name).toBe('new');
      expect(roleRepo.save).toHaveBeenCalledWith(role);
      expect(out).toBe(role);
    });

    it('系统内置角色 → 400', async () => {
      roleRepo.findOneBy.mockResolvedValue({ id: 1, isSystem: true });
      await expect(service.updateRole(1, { name: 'x' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(roleRepo.save).not.toHaveBeenCalled();
    });

    it('角色不存在 → 404(findOneRole 抛错)', async () => {
      roleRepo.findOneBy.mockResolvedValue(null);
      await expect(service.updateRole(9, { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ──── 权限 CRUD ────

  describe('findAllPermissions', () => {
    it('无 module → 空 where', async () => {
      permRepo.find.mockResolvedValue([{ id: 1 }]);
      await service.findAllPermissions();
      expect(permRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { id: 'ASC' },
      });
    });

    it('有 module → where.module', async () => {
      permRepo.find.mockResolvedValue([{ id: 1 }]);
      await service.findAllPermissions('papers');
      expect(permRepo.find).toHaveBeenCalledWith({
        where: { module: 'papers' },
        order: { id: 'ASC' },
      });
    });
  });

  describe('createPermission', () => {
    it('create + save', async () => {
      permRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.createPermission({
        code: 'p1',
        name: 'P1',
      } as never);
      expect(permRepo.create).toHaveBeenCalledWith({ code: 'p1', name: 'P1' });
      expect(permRepo.save).toHaveBeenCalled();
      expect(out).toMatchObject({ code: 'p1', name: 'P1' });
    });
  });

  // ──── 角色权限分配 ────

  describe('assignPermissions', () => {
    it('先删旧关联,再批量插入新关联', async () => {
      rpRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.assignPermissions('admin', ['p1', 'p2']);
      expect(rpRepo.delete).toHaveBeenCalledWith({ roleCode: 'admin' });
      expect(rpRepo.create).toHaveBeenCalledTimes(2);
      expect(rpRepo.create).toHaveBeenNthCalledWith(1, {
        roleCode: 'admin',
        permissionCode: 'p1',
      });
      expect(rpRepo.create).toHaveBeenNthCalledWith(2, {
        roleCode: 'admin',
        permissionCode: 'p2',
      });
      expect(rpRepo.save).toHaveBeenCalledWith([
        { roleCode: 'admin', permissionCode: 'p1' },
        { roleCode: 'admin', permissionCode: 'p2' },
      ]);
    });

    it('空权限列表 → 只删除,不插入', async () => {
      await service.assignPermissions('admin', []);
      expect(rpRepo.delete).toHaveBeenCalledWith({ roleCode: 'admin' });
      expect(rpRepo.create).not.toHaveBeenCalled();
      expect(rpRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getPermissionsForRole', () => {
    it('无关联记录 → 返回空数组', async () => {
      rpRepo.find.mockResolvedValue([]);
      await expect(service.getPermissionsForRole('admin')).resolves.toEqual([]);
      expect(permRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('有关联记录 → 用 IN 查询权限并排序', async () => {
      rpRepo.find.mockResolvedValue([
        { roleCode: 'admin', permissionCode: 'p1' },
        { roleCode: 'admin', permissionCode: 'p2' },
      ]);
      const qb = mockQueryBuilder({
        getMany: jest.fn().mockResolvedValue([{ code: 'p1' }]),
      });
      permRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      const res = await service.getPermissionsForRole('admin');
      expect(permRepo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(qb.where).toHaveBeenCalledWith('p.code IN (:...codes)', {
        codes: ['p1', 'p2'],
      });
      expect(qb.orderBy).toHaveBeenCalledWith('p.module', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('p.action', 'ASC');
      expect(res).toEqual([{ code: 'p1' }]);
    });
  });

  describe('checkPermission', () => {
    it('count > 0 → true', async () => {
      rpRepo.count.mockResolvedValue(3);
      await expect(service.checkPermission('admin', 'p1')).resolves.toBe(true);
      expect(rpRepo.count).toHaveBeenCalledWith({
        where: { roleCode: 'admin', permissionCode: 'p1' },
      });
    });

    it('count = 0 → false', async () => {
      rpRepo.count.mockResolvedValue(0);
      await expect(service.checkPermission('admin', 'none')).resolves.toBe(
        false,
      );
    });
  });
});
