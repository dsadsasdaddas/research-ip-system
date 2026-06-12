import { SchedulerRegistry } from '@nestjs/schedule';
import { BackupScheduleService } from './backup-schedule.service';
import type { BackupService } from './backup.service';
import type { MockObject } from '../testing/mocks';

// mock CronJob:构造函数记录 cron/cb,实例带 start 方法。非法 cron(throwInCtor=true)时构造抛错。
jest.mock('cron', () => {
  return {
    CronJob: jest.fn().mockImplementation((cron: string, cb: () => void) => {
      if (cron === 'INVALID') {
        throw new Error('invalid cron expression');
      }
      if (cron === 'NON_ERROR_THROW') {
        throw 'string-thrown';
      }
      return { start: jest.fn(), _cron: cron, _cb: cb };
    }),
  };
});

const { CronJob } = require('cron') as {
  CronJob: jest.Mock & { mock: { calls: unknown[][] } };
};

function mockBackupService(): MockObject {
  return {
    runBackup: jest
      .fn()
      .mockResolvedValue({ id: 1, status: 'success', filePath: '/x.sql' }),
    cleanupOldBackups: jest
      .fn()
      .mockResolvedValue({ deletedRows: 3, deletedFiles: 2 }),
  };
}

function mockRegistry(): SchedulerRegistry {
  return {
    addCronJob: jest.fn(),
  } as unknown as SchedulerRegistry;
}

describe('BackupScheduleService', () => {
  let backupService: MockObject;
  let registry: SchedulerRegistry;

  beforeEach(() => {
    backupService = mockBackupService();
    registry = mockRegistry();
    CronJob.mockClear();
  });

  afterEach(() => {
    delete process.env.BACKUP_ENABLED;
    delete process.env.BACKUP_CRON;
  });

  describe('onModuleInit', () => {
    it('未启用 → 不注册 cron', () => {
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      svc.onModuleInit();
      expect(CronJob).not.toHaveBeenCalled();
    });

    it('BACKUP_ENABLED=true(大写) → 注册 cron 并 start', () => {
      process.env.BACKUP_ENABLED = 'TRUE';
      process.env.BACKUP_CRON = '0 2 * * *';
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      svc.onModuleInit();
      expect(CronJob).toHaveBeenCalledTimes(1);
      expect(CronJob.mock.calls[0][0]).toBe('0 2 * * *');
      expect(
        (registry as unknown as MockObject).addCronJob,
      ).toHaveBeenCalledWith(
        'daily-full-backup',
        expect.objectContaining({ start: expect.any(Function) }),
      );
    });

    it('使用默认 cron(EVERY_DAY_AT_2AM)', () => {
      process.env.BACKUP_ENABLED = 'true';
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      svc.onModuleInit();
      expect(typeof CronJob.mock.calls[0][0]).toBe('string');
    });

    it('注册的 cron 回调被触发时 → 真实执行 runScheduledBackup(走真实方法体)', async () => {
      process.env.BACKUP_ENABLED = 'true';
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      svc.onModuleInit();
      const cb = CronJob.mock.calls[0][1] as () => void;
      cb(); // 不再 mock runScheduledBackup —— 让回调走真实路径
      await new Promise<void>((r) => setImmediate(r)); // 等真实 async 完成
      expect(backupService.runBackup).toHaveBeenCalledWith(
        'auto',
        null,
        'system-cron',
      );
      expect(backupService.cleanupOldBackups).toHaveBeenCalledWith(30);
    });

    it('回调触发且备份失败 → 真实方法体捕获并记日志,不静默吞错', async () => {
      process.env.BACKUP_ENABLED = 'true';
      backupService.runBackup.mockRejectedValue(new Error('dump boom'));
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      svc.onModuleInit();
      const cb = CronJob.mock.calls[0][1] as () => void;
      const logSpy = jest
        .spyOn(svc['logger'], 'error')
        .mockImplementation(() => undefined);
      cb();
      await new Promise<void>((r) => setImmediate(r));
      expect(logSpy).toHaveBeenCalled(); // 失败被记日志(非静默)
      expect(backupService.cleanupOldBackups).toHaveBeenCalled(); // cleanup 仍独立执行
      logSpy.mockRestore();
    });

    it('cron 表达式非法 → 记录错误但不抛', () => {
      process.env.BACKUP_ENABLED = 'true';
      process.env.BACKUP_CRON = 'INVALID';
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      expect(() => svc.onModuleInit()).not.toThrow();
    });

    it('CronJob 抛非 Error → catch 走 String(err) 分支不崩', () => {
      process.env.BACKUP_ENABLED = 'true';
      process.env.BACKUP_CRON = 'NON_ERROR_THROW';
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      expect(() => svc.onModuleInit()).not.toThrow();
    });
  });

  describe('runScheduledBackup', () => {
    it('backup 成功 + cleanup 成功', async () => {
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      await svc.runScheduledBackup();
      expect(backupService.runBackup).toHaveBeenCalledWith(
        'auto',
        null,
        'system-cron',
      );
      expect(backupService.cleanupOldBackups).toHaveBeenCalledWith(30);
    });

    it('runBackup 抛错 → cleanup 仍执行(各自独立 try/catch)', async () => {
      backupService.runBackup.mockRejectedValue(new Error('dump boom'));
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      await expect(svc.runScheduledBackup()).resolves.toBeUndefined();
      expect(backupService.cleanupOldBackups).toHaveBeenCalled();
    });

    it('cleanup 抛错 → 不影响已完成 backup', async () => {
      backupService.cleanupOldBackups.mockRejectedValue(
        new Error('cleanup boom'),
      );
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      await expect(svc.runScheduledBackup()).resolves.toBeUndefined();
      expect(backupService.runBackup).toHaveBeenCalled();
    });

    it('runBackup 抛非 Error 对象 → 走 String 分支不崩', async () => {
      backupService.runBackup.mockRejectedValue('str-err');
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      await expect(svc.runScheduledBackup()).resolves.toBeUndefined();
    });

    it('cleanup 抛非 Error 对象 → 走 String 分支不崩', async () => {
      backupService.cleanupOldBackups.mockRejectedValue({ code: 500 });
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      await expect(svc.runScheduledBackup()).resolves.toBeUndefined();
    });

    it('backup 成功但 status/filePath 缺省 → 日志走 filePath ?? "-"', async () => {
      backupService.runBackup.mockResolvedValue({
        id: 1,
        status: 'success',
        filePath: null,
      });
      const svc = new BackupScheduleService(
        backupService as unknown as BackupService,
        registry,
      );
      await expect(svc.runScheduledBackup()).resolves.toBeUndefined();
    });
  });
});
