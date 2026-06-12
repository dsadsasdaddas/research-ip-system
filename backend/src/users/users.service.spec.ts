import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { mockRepository } from '../testing/mocks';
import type { User } from './entities/user.entity';
import { UserRole } from './entities/user.entity';
import type { Department } from '../departments/entities/department.entity';

// 让密码哈希可预测,避免真实 bcrypt 拖慢单测
jest.mock('bcryptjs');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof mockRepository>;
  let deptRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    bcryptMock.hash.mockResolvedValue('hashed-pwd');
    repo = mockRepository({
      create: jest
        .fn()
        .mockImplementation((dto: unknown) => ({ ...(dto as object) })),
      save: jest
        .fn()
        .mockImplementation((entity: unknown) =>
          Promise.resolve({ id: 1, ...(entity as object) }),
        ),
    });
    deptRepo = mockRepository();
    service = new UsersService(
      repo as unknown as Repository<User>,
      deptRepo as unknown as Repository<Department>,
    );
  });

  describe('findByUsername', () => {
    it('委托 repo.findOne by username', async () => {
      repo.findOne.mockResolvedValue({ id: 7, username: 'a' });
      const u = await service.findByUsername('a');
      expect(u).toEqual({ id: 7, username: 'a' });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { username: 'a' } });
    });
  });

  describe('findById', () => {
    it('找到 → 返回', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      await expect(service.findById(1)).resolves.toEqual({ id: 1 });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
    it('未找到 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findOne (public)', () => {
    it('剥除 password 返回', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        username: 'a',
        password: 'p',
        role: UserRole.RESEARCHER,
      });
      const u = await service.findOne(1);
      expect(u.password).toBeUndefined();
      expect(u.username).toBe('a');
    });
    it('底层 findById 404 → 抛出', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('按 createTime DESC 拉取并剥除密码', async () => {
      repo.find.mockResolvedValue([
        { id: 1, username: 'a', password: 'p' },
        { id: 2, username: 'b', password: 'p' },
      ]);
      const list = await service.findAll();
      expect(list).toHaveLength(2);
      expect(list[0].password).toBeUndefined();
      expect(list[1].username).toBe('b');
      expect(repo.find).toHaveBeenCalledWith({ order: { createTime: 'DESC' } });
    });
  });

  describe('create', () => {
    it('用户名已存在 → 409', async () => {
      repo.findOne.mockResolvedValue({ id: 9 });
      await expect(
        service.create({ username: 'a', password: '123456' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { username: 'a' } });
    });

    it('指定了 deptId 但部门不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null); // 用户名不重复
      deptRepo.findOne.mockResolvedValue(null); // 部门不存在
      await expect(
        service.create({
          username: 'a',
          password: '123456',
          deptId: 5,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('完整路径:哈希密码 + 注入默认值 + 剥除密码返回', async () => {
      repo.findOne.mockResolvedValue(null);
      deptRepo.findOne.mockResolvedValue({ id: 5 });
      const created = await service.create({
        username: 'a',
        password: '123456',
        deptId: 5,
        role: UserRole.DEPT_ADMIN,
      });
      expect(bcryptMock.hash).toHaveBeenCalledWith('123456', 10);
      const arg = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.password).toBe('hashed-pwd');
      expect(arg.deptId).toBe(5);
      expect(arg.realName).toBeNull(); // 未传 → null
      expect(arg.email).toBeNull();
      expect(created.password).toBeUndefined();
    });

    it('deptId 为 null/undefined → 跳过部门检查,deptId 落 null', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = await service.create({
        username: 'a',
        password: '123456',
      });
      const arg = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.deptId).toBeNull();
      expect(deptRepo.findOne).not.toHaveBeenCalled();
      expect(created.id).toBe(1);
    });
  });

  describe('update', () => {
    it('用户不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('改 deptId 但部门不存在 → 404', async () => {
      repo.findOne.mockResolvedValue({ id: 1, username: 'a' });
      deptRepo.findOne.mockResolvedValue(null);
      await expect(service.update(1, { deptId: 9 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('password 为空串 → 400', async () => {
      repo.findOne.mockResolvedValue({ id: 1, username: 'a' });
      await expect(service.update(1, { password: '' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('带 password → 哈希后合并保存', async () => {
      const user = { id: 1, username: 'a', password: 'old', deptId: null };
      repo.findOne.mockResolvedValue(user);
      const updated = await service.update(1, {
        password: 'newpass',
        realName: 'N',
      });
      expect(bcryptMock.hash).toHaveBeenCalledWith('newpass', 10);
      expect(user.password).toBe('hashed-pwd');
      expect(user.realName).toBe('N');
      expect(updated.password).toBeUndefined();
    });

    it('password 为 null/undefined → 删除 password 字段不更新', async () => {
      const user = { id: 1, username: 'a', password: 'old' };
      repo.findOne.mockResolvedValue(user);
      await service.update(1, { realName: 'N' });
      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(user.password).toBe('old'); // 原密码保留
      expect(user.realName).toBe('N');
    });
  });

  describe('remove', () => {
    it('用户不存在 → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('删除 admin 账号 → 400', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        role: UserRole.SYS_ADMIN,
      });
      await expect(service.remove(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('删除最后一个启用的 sys_admin → 400', async () => {
      repo.findOne.mockResolvedValue({
        id: 2,
        username: 'root2',
        role: UserRole.SYS_ADMIN,
      });
      repo.count.mockResolvedValue(1);
      await expect(service.remove(2)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('删除非管理员普通账号 → 成功', async () => {
      repo.findOne.mockResolvedValue({
        id: 3,
        username: 'u',
        role: UserRole.RESEARCHER,
      });
      await expect(service.remove(3)).resolves.toEqual({
        deleted: true,
        id: 3,
      });
      expect(repo.remove).toHaveBeenCalled();
    });

    it('删除多个 sys_admin 之一 → 成功', async () => {
      repo.findOne.mockResolvedValue({
        id: 4,
        username: 'admin2',
        role: UserRole.SYS_ADMIN,
      });
      repo.count.mockResolvedValue(3);
      await expect(service.remove(4)).resolves.toEqual({
        deleted: true,
        id: 4,
      });
    });
  });

  describe('seedAdmin', () => {
    it('部门与所有账号均已存在 → 全部跳过,不创建任何账号', async () => {
      // 两个部门都存在
      deptRepo.findOne.mockImplementation((args: { where: { name: string } }) =>
        Promise.resolve({ id: args.where.name === '计算机研究所' ? 1 : 2 }),
      );
      // 每个账号都已存在
      repo.findOne.mockResolvedValue({ id: 1 });
      const logSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      await service.seedAdmin();
      expect(repo.create).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('部门不存在 → 创建部门;缺失账号 → 补齐并打印日志', async () => {
      // 部门按 name 查全部缺失;按 id 查(create 里 ensureDeptExists)存在
      deptRepo.findOne.mockImplementation(
        (args: { where: { name?: number; id?: number } }) => {
          if (args.where.id !== undefined)
            return Promise.resolve({ id: args.where.id });
          return Promise.resolve(null); // 按 name 查 → 缺失
        },
      );
      deptRepo.save.mockImplementation((e: unknown) =>
        Promise.resolve({ id: 1, ...(e as object) }),
      );
      deptRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      // 仅 admin 账号已存在,其余账号缺失 → 触发 create
      repo.findOne.mockResolvedValueOnce({ id: 1 }); // admin exists
      repo.findOne.mockResolvedValue(null); // 其余都缺失
      const logSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      await service.seedAdmin();
      // 部门创建两次
      expect(deptRepo.save).toHaveBeenCalledTimes(2);
      // 除 admin 外 7 个账号被 create
      expect(repo.create).toHaveBeenCalledTimes(7);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('第一个部门缺失、第二个部门存在 → 只创建缺失的部门', async () => {
      // 计算机所缺失,电子所存在
      deptRepo.findOne.mockImplementation((args: { where: { name: string } }) =>
        Promise.resolve(args.where.name === '计算机研究所' ? null : { id: 2 }),
      );
      deptRepo.save.mockResolvedValue({ id: 1 });
      deptRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      // 所有账号都已存在 → 不进入 create 分支
      repo.findOne.mockResolvedValue({ id: 1 });
      jest.spyOn(console, 'log').mockImplementation(() => undefined);
      await service.seedAdmin();
      expect(deptRepo.save).toHaveBeenCalledTimes(1); // 仅计算机所
      expect(repo.create).not.toHaveBeenCalled();
    });
  });
});
