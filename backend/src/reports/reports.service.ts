import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportExportLog } from './entities/report-export-log.entity';
import { ScheduledReportTask } from './entities/scheduled-report-task.entity';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { CreateScheduledReportTaskDto } from './dto/create-scheduled-report-task.dto';
import { UpdateScheduledReportTaskDto } from './dto/update-scheduled-report-task.dto';
import { paginate, PageResult } from '../common/utils/pagination';
import type { AuthUser } from '../auth/types/auth-user.interface';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportTemplate) private templateRepo: Repository<ReportTemplate>,
    @InjectRepository(ReportExportLog) private exportLogRepo: Repository<ReportExportLog>,
    @InjectRepository(ScheduledReportTask) private scheduledTaskRepo: Repository<ScheduledReportTask>,
  ) {}

  // ──── 报表模板 CRUD ────

  async createTemplate(dto: CreateReportTemplateDto): Promise<ReportTemplate> {
    const entity = this.templateRepo.create(dto);
    return this.templateRepo.save(entity);
  }

  async updateTemplate(id: number, dto: UpdateReportTemplateDto): Promise<ReportTemplate> {
    const template = await this.findOneTemplate(id);
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async findAllTemplates(reportType?: string): Promise<ReportTemplate[]> {
    const where: Record<string, string> = {};
    if (reportType) where.reportType = reportType;
    return this.templateRepo.find({ where, order: { id: 'ASC' } });
  }

  async findOneTemplate(id: number): Promise<ReportTemplate> {
    const template = await this.templateRepo.findOneBy({ id });
    if (!template) throw new NotFoundException(`报表模板 #${id} 不存在`);
    return template;
  }

  async removeTemplate(id: number): Promise<{ deleted: true; id: number }> {
    await this.findOneTemplate(id);
    await this.templateRepo.delete(id);
    return { deleted: true, id };
  }

  // ──── 报表导出 ────

  async exportReport(templateId: number, format: string, user: AuthUser): Promise<ReportExportLog> {
    const template = await this.findOneTemplate(templateId);
    const reportType = template.reportType;
    const effectiveFormat = format || 'xlsx';

    // 创建导出日志
    const logEntry = this.exportLogRepo.create({
      templateId,
      reportType,
      exportFormat: effectiveFormat,
      status: 'pending',
      userId: user.id,
      username: user.username,
    });
    const savedLog = await this.exportLogRepo.save(logEntry);

    try {
      // 确保 exports 目录存在
      const exportsDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const fileName = `${reportType}_${template.code}_${Date.now()}.${effectiveFormat}`;
      const filePath = path.join(exportsDir, fileName);

      // 解析模板配置
      const config = template.configJson ? JSON.parse(template.configJson) : {};
      const columns: Array<{ header: string; key: string }> = config.columns || [];

      // 查询数据 — 使用原始 SQL 查询对应表
      const tableName = this.getTableName(reportType);
      let data: Record<string, unknown>[] = [];
      if (tableName) {
        data = await this.templateRepo.manager.query(`SELECT * FROM \`${tableName}\` LIMIT 10000`);
      }

      if (effectiveFormat === 'xlsx') {
        await this.generateXlsx(filePath, columns, data);
      } else if (effectiveFormat === 'csv') {
        await this.generateCsv(filePath, columns, data);
      } else {
        // pdf 格式暂用 xlsx 替代
        await this.generateXlsx(filePath, columns, data);
      }

      // 更新导出日志为成功
      savedLog.filePath = filePath;
      savedLog.status = 'success';
      savedLog.finishTime = new Date();
      await this.exportLogRepo.save(savedLog);

      return savedLog;
    } catch (err) {
      savedLog.status = 'failed';
      savedLog.errorMessage = err instanceof Error ? err.message : String(err);
      savedLog.finishTime = new Date();
      await this.exportLogRepo.save(savedLog);
      return savedLog;
    }
  }

  /** 根据报表类型获取表名 */
  private getTableName(reportType: string): string | null {
    const map: Record<string, string> = {
      paper: 'paper',
      patent: 'patent',
      fee: 'fee',
      transform: 'transform',
    };
    return map[reportType] ?? null;
  }

  /** 使用 exceljs 生成 xlsx 文件 */
  private async generateXlsx(
    filePath: string,
    columns: Array<{ header: string; key: string }>,
    data: Record<string, unknown>[],
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报表');

    if (columns.length > 0) {
      worksheet.columns = columns.map((col) => ({
        header: col.header || col.key,
        key: col.key,
        width: 20,
      }));
      data.forEach((row) => {
        worksheet.addRow(row);
      });
    } else {
      // 无配置列时，用数据的第一行作为表头
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        worksheet.columns = keys.map((k) => ({ header: k, key: k, width: 20 }));
        data.forEach((row) => worksheet.addRow(row));
      }
    }

    await workbook.xlsx.writeFile(filePath);
  }

  /** 生成 csv 文件 */
  private async generateCsv(
    filePath: string,
    columns: Array<{ header: string; key: string }>,
    data: Record<string, unknown>[],
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报表');

    if (columns.length > 0) {
      worksheet.columns = columns.map((col) => ({
        header: col.header || col.key,
        key: col.key,
      }));
      data.forEach((row) => worksheet.addRow(row));
    } else if (data.length > 0) {
      const keys = Object.keys(data[0]);
      worksheet.columns = keys.map((k) => ({ header: k, key: k }));
      data.forEach((row) => worksheet.addRow(row));
    }

    await workbook.csv.writeFile(filePath);
  }

  // ──── 导出日志 ────

  async findAllExportLogs(page?: number, pageSize?: number): Promise<PageResult<ReportExportLog>> {
    const qb = this.exportLogRepo
      .createQueryBuilder('l')
      .orderBy('l.create_time', 'DESC');
    return paginate(qb, page, pageSize);
  }

  async findOneExportLog(id: number): Promise<ReportExportLog> {
    const log = await this.exportLogRepo.findOneBy({ id });
    if (!log) throw new NotFoundException(`导出日志 #${id} 不存在`);
    return log;
  }

  // ──── 定时报表任务 CRUD ────

  async createScheduledTask(dto: CreateScheduledReportTaskDto): Promise<ScheduledReportTask> {
    const entity = this.scheduledTaskRepo.create(dto);
    return this.scheduledTaskRepo.save(entity);
  }

  async updateScheduledTask(id: number, dto: UpdateScheduledReportTaskDto): Promise<ScheduledReportTask> {
    const task = await this.scheduledTaskRepo.findOneBy({ id });
    if (!task) throw new NotFoundException(`定时报表任务 #${id} 不存在`);
    Object.assign(task, dto);
    return this.scheduledTaskRepo.save(task);
  }

  async findAllScheduledTasks(): Promise<ScheduledReportTask[]> {
    return this.scheduledTaskRepo.find({ order: { id: 'ASC' } });
  }

  async removeScheduledTask(id: number): Promise<{ deleted: true; id: number }> {
    const task = await this.scheduledTaskRepo.findOneBy({ id });
    if (!task) throw new NotFoundException(`定时报表任务 #${id} 不存在`);
    await this.scheduledTaskRepo.delete(id);
    return { deleted: true, id };
  }
}
