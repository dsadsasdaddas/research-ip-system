import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { BackupService } from './backup.service';

/**
 * §4 数据备份 —— 定时全量备份 + 30 天保留期清理。
 *
 * 配置(环境变量):
 *   BACKUP_ENABLED  'true'/'false',未设置或非 'true' → 不启用(不报错)
 *   BACKUP_CRON     5 字段 cron 表达式,未设置 → 默认每天 02:00 ('0 2 * * *')
 *
 * 在 onModuleInit 里根据配置动态注册 cron job;
 * 若不启用则仅打印一行 info 后跳过,绝不抛错,保证应用正常启动。
 */
@Injectable()
export class BackupScheduleService implements OnModuleInit {
  private readonly logger = new Logger(BackupScheduleService.name);
  private static readonly JOB_NAME = 'daily-full-backup';

  constructor(
    private readonly backupService: BackupService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const enabled = (process.env.BACKUP_ENABLED ?? '').toLowerCase() === 'true';

    if (!enabled) {
      this.logger.log('定时备份未启用(BACKUP_ENABLED 未设为 true),跳过注册。');
      return;
    }

    const cronExpression =
      process.env.BACKUP_CRON ?? CronExpression.EVERY_DAY_AT_2AM;

    try {
      const job = new CronJob(cronExpression, () => {
        void this.runScheduledBackup();
      });
      this.schedulerRegistry.addCronJob(BackupScheduleService.JOB_NAME, job);
      job.start();
      this.logger.log(
        `定时备份已启用,cron = "${cronExpression}"(每天全量备份 + 30 天保留清理)。`,
      );
    } catch (err) {
      // cron 表达式非法等:记录但不中断启动
      this.logger.error(
        `注册定时备份失败(cron="${cronExpression}"): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * 实际的定时任务体:
   *   1. 跑一次全量备份(与 POST /backup/trigger 同一逻辑)
   *   2. 清理 30 天前的备份记录与文件
   */
  async runScheduledBackup(): Promise<void> {
    this.logger.log('定时备份任务开始执行...');
    try {
      const backup = await this.backupService.runBackup(
        'auto',
        null,
        'system-cron',
      );
      this.logger.log(
        `定时备份完成: status=${backup.status}, file=${backup.filePath ?? '-'}`,
      );
    } catch (err) {
      this.logger.error(
        `定时备份执行异常: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      const cleanup = await this.backupService.cleanupOldBackups(30);
      this.logger.log(
        `保留期清理完成: 删除记录 ${cleanup.deletedRows} 行,文件 ${cleanup.deletedFiles} 个。`,
      );
    } catch (err) {
      this.logger.error(
        `保留期清理异常: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
