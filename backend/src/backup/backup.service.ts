import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { BackupLog } from './entities/backup-log.entity';
import { paginate, PageResult } from '../common/utils/pagination';
import type { AuthUser } from '../auth/types/auth-user.interface';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  constructor(
    @InjectRepository(BackupLog) private backupLogRepo: Repository<BackupLog>,
  ) {}

  /** 触发数据库备份 */
  async triggerBackup(user?: AuthUser): Promise<BackupLog> {
    const logEntry = this.backupLogRepo.create({
      backupType: 'manual',
      status: 'pending',
      operatorId: user?.id ?? null,
      operatorName: user?.username ?? null,
      startedAt: new Date(),
    });
    const savedLog = await this.backupLogRepo.save(logEntry);

    try {
      // 确保备份目录存在
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `backup_${timestamp}.sql`;
      const filePath = path.join(backupDir, fileName);

      // 从环境变量构建 mysqldump 命令
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';
      const dbUser = process.env.DB_USER || 'root';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'research_ip';

      const authPart = dbPassword
        ? `-h${dbHost} -P${dbPort} -u${dbUser} -p${dbPassword}`
        : `-h${dbHost} -P${dbPort} -u${dbUser}`;

      const command = `mysqldump ${authPart} --single-transaction --routines --triggers ${dbName} > "${filePath}"`;

      await execAsync(command, { timeout: 300000 }); // 5分钟超时

      // 获取文件大小
      const stat = fs.statSync(filePath);

      savedLog.filePath = filePath;
      savedLog.fileSize = stat.size;
      savedLog.status = 'success';
      savedLog.finishedAt = new Date();
      await this.backupLogRepo.save(savedLog);

      return savedLog;
    } catch (err) {
      savedLog.status = 'failed';
      savedLog.errorMessage = err instanceof Error ? err.message : String(err);
      savedLog.finishedAt = new Date();
      await this.backupLogRepo.save(savedLog);
      return savedLog;
    }
  }

  /** 从备份恢复数据库 */
  async restoreBackup(id: number, user?: AuthUser): Promise<BackupLog> {
    const backup = await this.backupLogRepo.findOneBy({ id });
    if (!backup) throw new NotFoundException(`备份记录 #${id} 不存在`);
    if (backup.status !== 'success') {
      throw new Error('只能从成功的备份恢复');
    }
    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      throw new Error('备份文件不存在');
    }

    try {
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';
      const dbUser = process.env.DB_USER || 'root';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'research_ip';

      const authPart = dbPassword
        ? `-h${dbHost} -P${dbPort} -u${dbUser} -p${dbPassword}`
        : `-h${dbHost} -P${dbPort} -u${dbUser}`;

      const command = `mysql ${authPart} ${dbName} < "${backup.filePath}"`;

      await execAsync(command, { timeout: 300000 });

      // 创建恢复日志
      const restoreLog = this.backupLogRepo.create({
        backupType: 'manual',
        status: 'restored',
        operatorId: user?.id ?? null,
        operatorName: user?.username ?? null,
        remark: `从备份 #${id} 恢复`,
        startedAt: new Date(),
        finishedAt: new Date(),
      });
      return this.backupLogRepo.save(restoreLog);
    } catch (err) {
      const restoreLog = this.backupLogRepo.create({
        backupType: 'manual',
        status: 'failed',
        operatorId: user?.id ?? null,
        operatorName: user?.username ?? null,
        remark: `从备份 #${id} 恢复失败`,
        errorMessage: err instanceof Error ? err.message : String(err),
        startedAt: new Date(),
        finishedAt: new Date(),
      });
      return this.backupLogRepo.save(restoreLog);
    }
  }

  /** 分页查询备份日志 */
  async findAll(page?: number, pageSize?: number): Promise<PageResult<BackupLog>> {
    const qb = this.backupLogRepo
      .createQueryBuilder('b')
      .orderBy('b.started_at', 'DESC');
    return paginate(qb, page, pageSize);
  }
}
