import { NotFoundException } from '@nestjs/common';
import { BackupService } from './backup.service';
import {
  mockRepository,
  mockQueryBuilder,
  type MockObject,
} from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { BackupLog } from './entities/backup-log.entity';

// jest.mock 必须放在文件顶层。把 child_process + fs 整体 mock 掉。
jest.mock('child_process', () => ({ exec: jest.fn() }));
jest.mock('fs');

const { exec } = require('child_process') as { exec: jest.Mock };

const fs = require('fs') as {
  existsSync: jest.Mock;
  mkdirSync: jest.Mock;
  statSync: jest.Mock;
  unlinkSync: jest.Mock;
};

describe('BackupService', () => {
  let service: BackupService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = mockRepository();
    service = new BackupService(repo as unknown as Repository<BackupLog>);
  });

  /** 让 exec 在下一次调用时按 (err, stdout, stderr) 调用回调(promisify 回调签名)。 */
  function execOnce(err: Error | null, stdout = '', stderr = '') {
    exec.mockImplementationOnce(
      (_cmd: unknown, _opts: unknown, cb: unknown) => {
        (cb as (e: Error | null, o: string, s: string) => void)(
          err,
          stdout,
          stderr,
        );
      },
    );
  }

  describe('triggerBackup', () => {
    it('委托 runBackup,透传 user', async () => {
      const spy = jest
        .spyOn(service, 'runBackup')
        .mockResolvedValue({ id: 1 } as BackupLog);
      await service.triggerBackup({ id: 7, username: 'alice' } as never);
      expect(spy).toHaveBeenCalledWith('manual', 7, 'alice');
    });

    it('user 为 undefined → operatorId/operatorName 为 null', async () => {
      const spy = jest
        .spyOn(service, 'runBackup')
        .mockResolvedValue({ id: 1 } as BackupLog);
      await service.triggerBackup();
      expect(spy).toHaveBeenCalledWith('manual', null, null);
    });
  });

  describe('runBackup', () => {
    it('成功:目录不存在→创建,执行 mysqldump,记录文件大小+success', async () => {
      fs.existsSync.mockReturnValue(false); // 触发 mkdirSync 分支
      fs.statSync.mockReturnValue({ size: 1234 });
      execOnce(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const saved: Record<string, unknown> = { status: 'pending' };
      repo.save.mockImplementation(async (entity: unknown) =>
        Object.assign(saved, entity),
      );

      process.env.DB_PASSWORD = 'secret';
      const out = await service.runBackup('manual', 3, 'bob');
      delete process.env.DB_PASSWORD;

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        { recursive: true },
      );
      // exec 第 0 参 = 命令串,第 1 参 = 选项
      expect(exec.mock.calls[0][0]).toEqual(
        expect.stringContaining('mysqldump'),
      );
      expect(exec.mock.calls[0][1]).toEqual(
        expect.objectContaining({ timeout: 300000 }),
      );
      expect(exec.mock.calls[0][0]).toContain('-psecret'); // 带密码时命令含 -p
      expect(saved.status).toBe('success');
      expect(saved.fileSize).toBe(1234);
      expect(saved.filePath).toMatch(/backup_.*\.sql$/);
      expect(saved.finishedAt).toBeInstanceOf(Date);
      expect(out).toBe(saved);
    });

    it('无密码时命令不带 -p,目录已存在不创建', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 10 });
      execOnce(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      repo.save.mockImplementation(async (entity: unknown) => entity);

      delete process.env.DB_PASSWORD;
      await service.runBackup('auto', null, null);

      expect(exec.mock.calls[0][0]).not.toContain('-p');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('exec 失败 → 记录 failed + errorMessage 并返回', async () => {
      fs.existsSync.mockReturnValue(true);
      execOnce(new Error('dump failed'));
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const saved: Record<string, unknown> = {};
      repo.save.mockImplementation(async (entity: unknown) =>
        Object.assign(saved, entity),
      );

      const out = await service.runBackup('manual', null, null);

      expect(saved.status).toBe('failed');
      expect(saved.errorMessage).toBe('dump failed');
      expect(saved.finishedAt).toBeInstanceOf(Date);
      expect(out).toBe(saved);
    });

    it('exec 抛非 Error 对象 → errorMessage 取 String(err)', async () => {
      fs.existsSync.mockReturnValue(true);
      execOnce('boom-string' as unknown as null); // 非 Error
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const saved: Record<string, unknown> = {};
      repo.save.mockImplementation(async (entity: unknown) =>
        Object.assign(saved, entity),
      );

      await service.runBackup('manual', null, null);
      expect(saved.errorMessage).toBe('boom-string');
      expect(saved.status).toBe('failed');
    });

    it('DB_* 环境变量全部缺失 → 走各 || 默认值且无密码', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1 });
      execOnce(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      repo.save.mockImplementation(async (e: unknown) => e);
      const envKeys = [
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
      ];
      const saved: Record<string, string | undefined> = {};
      envKeys.forEach((k) => {
        saved[k] = process.env[k];
        delete process.env[k];
      });
      try {
        await service.runBackup('manual', null, null);
        const cmd = exec.mock.calls[0][0] as string;
        // 全部走默认值
        expect(cmd).toContain('-hlocalhost');
        expect(cmd).toContain('-P3306');
        expect(cmd).toContain('-uroot');
        expect(cmd).toContain('research_ip');
        expect(cmd).not.toContain('-p');
      } finally {
        envKeys.forEach((k) => {
          if (saved[k] !== undefined) process.env[k] = saved[k];
        });
      }
    });
  });

  describe('restoreBackup', () => {
    it('备份记录不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.restoreBackup(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('状态非 success → 抛错', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'failed',
        filePath: '/x.sql',
      });
      await expect(service.restoreBackup(1)).rejects.toThrow(
        '只能从成功的备份恢复',
      );
    });

    it('filePath 缺失 → 抛错', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: null,
      });
      await expect(service.restoreBackup(1)).rejects.toThrow('备份文件不存在');
    });

    it('文件物理不存在 → 抛错', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: '/gone.sql',
      });
      fs.existsSync.mockReturnValue(false);
      await expect(service.restoreBackup(1)).rejects.toThrow('备份文件不存在');
    });

    it('成功 → 写 restored 日志并返回', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: '/b.sql',
      });
      fs.existsSync.mockReturnValue(true);
      execOnce(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const restored = { id: 2 };
      repo.save.mockResolvedValue(restored);

      process.env.DB_PASSWORD = 'pw';
      const out = await service.restoreBackup(1, {
        id: 5,
        username: 'op',
      } as never);
      delete process.env.DB_PASSWORD;

      expect(exec.mock.calls[0][0]).toEqual(expect.stringContaining('mysql'));
      expect(exec.mock.calls[0][1]).toEqual(
        expect.objectContaining({ timeout: 300000 }),
      );
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.status).toBe('restored');
      expect(created.operatorId).toBe(5);
      expect(created.operatorName).toBe('op');
      expect(created.remark).toContain('#1');
      expect(out).toBe(restored);
    });

    it('restore 无 user → operatorId/Name 为 null', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: '/b.sql',
      });
      fs.existsSync.mockReturnValue(true);
      execOnce(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      repo.save.mockImplementation(async (e: unknown) => e);
      delete process.env.DB_PASSWORD;
      await service.restoreBackup(1);
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.operatorId).toBeNull();
      expect(created.operatorName).toBeNull();
    });

    it('restore exec 失败 → 写 failed 日志', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: '/b.sql',
      });
      fs.existsSync.mockReturnValue(true);
      execOnce(new Error('restore boom'));
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const failed = { id: 3 };
      repo.save.mockResolvedValue(failed);

      const out = await service.restoreBackup(1);
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.status).toBe('failed');
      expect(created.errorMessage).toBe('restore boom');
      expect(created.remark).toContain('失败');
      expect(out).toBe(failed);
    });

    it('restore exec 失败且为非 Error → errorMessage 取 String', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: '/b.sql',
      });
      fs.existsSync.mockReturnValue(true);
      execOnce('str-err' as unknown as null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      repo.save.mockImplementation(async (e: unknown) => e);
      await service.restoreBackup(1);
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.errorMessage).toBe('str-err');
    });

    it('DB_* 全缺 → restore 走默认值', async () => {
      repo.findOneBy.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: '/b.sql',
      });
      fs.existsSync.mockReturnValue(true);
      execOnce(null);
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      repo.save.mockImplementation(async (e: unknown) => e);
      const envKeys = [
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
      ];
      const saved: Record<string, string | undefined> = {};
      envKeys.forEach((k) => {
        saved[k] = process.env[k];
        delete process.env[k];
      });
      try {
        await service.restoreBackup(1);
        const cmd = exec.mock.calls[0][0] as string;
        expect(cmd).toContain('-hlocalhost');
        expect(cmd).toContain('research_ip');
        expect(cmd).not.toContain('-p');
      } finally {
        envKeys.forEach((k) => {
          if (saved[k] !== undefined) process.env[k] = saved[k];
        });
      }
    });
  });

  describe('findAll', () => {
    function withSharedQb(terminal: Partial<MockObject>): MockObject {
      const qb = mockQueryBuilder(terminal);
      repo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      service = new BackupService(repo as unknown as Repository<BackupLog>);
      return qb;
    }

    it('走 createQueryBuilder + paginate', async () => {
      const qb = withSharedQb({
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });
      const res = await service.findAll(2, 10);
      expect(res.items).toEqual([{ id: 1 }]);
      expect(res.total).toBe(1);
      expect(qb.orderBy).toHaveBeenCalledWith('b.started_at', 'DESC');
    });
  });

  describe('cleanupOldBackups', () => {
    /**
     * cleanup 内 service 会调两次 createQueryBuilder(一次 getMany,一次 delete+execute)。
     * 让 repo 共享同一个 qb,terminal 同时控制 getMany / execute 即可。
     */
    function withSharedQb(terminal: Partial<MockObject>): MockObject {
      const qb = mockQueryBuilder(terminal);
      repo = mockRepository({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });
      service = new BackupService(repo as unknown as Repository<BackupLog>);
      return qb;
    }

    it('无旧记录 → 0/0,不进删行', async () => {
      const qb = withSharedQb({ getMany: jest.fn().mockResolvedValue([]) });
      const res = await service.cleanupOldBackups(30);
      expect(res).toEqual({ deletedRows: 0, deletedFiles: 0 });
      expect(qb.delete).not.toHaveBeenCalled();
    });

    it('有旧记录:删除存在文件 + 批量删行', async () => {
      withSharedQb({
        getMany: jest.fn().mockResolvedValue([
          { id: 1, filePath: '/a.sql' },
          { id: 2, filePath: '/b.sql' },
          { id: 3, filePath: null }, // 无 filePath 跳过
        ]),
        execute: jest
          .fn()
          .mockResolvedValue({ affected: 3, generatedMaps: [], raw: [] }),
      });
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue(undefined);

      const res = await service.cleanupOldBackups();
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(res.deletedFiles).toBe(2);
      expect(res.deletedRows).toBe(3);
    });

    it('文件不存在 → 不计 deletedFiles,但删行仍进行', async () => {
      withSharedQb({
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 1, filePath: '/gone.sql' }]),
        execute: jest
          .fn()
          .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] }),
      });
      fs.existsSync.mockReturnValue(false);

      const res = await service.cleanupOldBackups();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(res.deletedFiles).toBe(0);
      expect(res.deletedRows).toBe(1);
    });

    it('unlink 抛错被吞,删行继续', async () => {
      withSharedQb({
        getMany: jest.fn().mockResolvedValue([{ id: 1, filePath: '/a.sql' }]),
        execute: jest
          .fn()
          .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] }),
      });
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('locked');
      });

      const res = await service.cleanupOldBackups();
      expect(res.deletedFiles).toBe(0);
      expect(res.deletedRows).toBe(1);
    });

    it('affected 为 undefined → deletedRows 取 0', async () => {
      withSharedQb({
        getMany: jest.fn().mockResolvedValue([{ id: 1, filePath: null }]),
        execute: jest.fn().mockResolvedValue({
          affected: undefined,
          generatedMaps: [],
          raw: [],
        }),
      });
      const res = await service.cleanupOldBackups();
      expect(res.deletedRows).toBe(0);
    });
  });
});
