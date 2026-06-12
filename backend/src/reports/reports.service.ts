import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as fontkit from 'fontkit';
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
    @InjectRepository(ReportTemplate)
    private templateRepo: Repository<ReportTemplate>,
    @InjectRepository(ReportExportLog)
    private exportLogRepo: Repository<ReportExportLog>,
    @InjectRepository(ScheduledReportTask)
    private scheduledTaskRepo: Repository<ScheduledReportTask>,
  ) {}

  // ──── 报表模板 CRUD ────

  async createTemplate(dto: CreateReportTemplateDto): Promise<ReportTemplate> {
    const entity = this.templateRepo.create(dto);
    return this.templateRepo.save(entity);
  }

  async updateTemplate(
    id: number,
    dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplate> {
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

  async exportReport(
    templateId: number,
    format: string,
    user: AuthUser,
  ): Promise<ReportExportLog> {
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
      const columns: Array<{ header: string; key: string }> =
        config.columns || [];

      // 查询数据 — 使用原始 SQL 查询对应表
      const tableName = this.getTableName(reportType);
      let data: Record<string, unknown>[] = [];
      if (tableName) {
        data = await this.templateRepo.manager.query(
          `SELECT * FROM \`${tableName}\` LIMIT 10000`,
        );
      }

      if (effectiveFormat === 'xlsx') {
        await this.generateXlsx(filePath, columns, data);
      } else if (effectiveFormat === 'csv') {
        await this.generateCsv(filePath, columns, data);
      } else if (effectiveFormat === 'pdf') {
        await this.generatePdf(
          filePath,
          columns,
          data,
          `${reportType}报表 ${template.code}`,
        );
      } else {
        // 未知格式回退到 xlsx
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

  /**
   * 生成 csv 文件。
   *
   * 不用 ExcelJS 的 workbook.csv:① 它不写 UTF-8 BOM,Excel 在 Windows 下会按 GBK
   *    解码,中文全乱码(用户看到的就是"导出失败/打不开");② 行尾是 LF,部分 Excel
   *    版本解析异常。这里手写 RFC 4180:加 BOM、用 CRLF、对含逗号/引号/换行的字段
   *    做引号转义,直接落盘。
   */
  private async generateCsv(
    filePath: string,
    columns: Array<{ header: string; key: string }>,
    data: Record<string, unknown>[],
  ): Promise<void> {
    // 确定列:显式配置优先,否则取数据首行的 key
    let cols: Array<{ header: string; key: string }>;
    if (columns.length > 0) {
      cols = columns.map((col) => ({
        header: col.header || col.key,
        key: col.key,
      }));
    } else if (data.length > 0) {
      cols = Object.keys(data[0]).map((k) => ({ header: k, key: k }));
    } else {
      cols = [];
    }

    const escapeCell = (raw: unknown): string => {
      let s: string;
      if (raw === null || raw === undefined) {
        s = '';
      } else if (raw instanceof Date) {
        s = raw.toLocaleString('zh-CN');
      } else if (typeof raw === 'object') {
        s = JSON.stringify(raw); // JSON 列等结构化字段
      } else {
        s = String(raw);
      }
      // 含逗号/引号/换行/回车的字段:用双引号包裹,内部引号翻倍(RFC 4180)
      if (/[",\r\n]/.test(s)) {
        s = `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines: string[] = [];
    if (cols.length > 0) {
      lines.push(cols.map((c) => escapeCell(c.header)).join(','));
      data.forEach((row) => {
        lines.push(cols.map((c) => escapeCell(row[c.key])).join(','));
      });
    }

    // UTF-8 BOM(﻿)让 Excel 正确识别编码;CRLF 行尾适配 Windows Excel
    const content = '﻿' + lines.join('\r\n') + (lines.length > 0 ? '\r\n' : '');
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  /** 使用 pdfkit 生成 pdf 文件:标题 + 表头 + 数据行 */
  private async generatePdf(
    filePath: string,
    columns: Array<{ header: string; key: string }>,
    data: Record<string, unknown>[],
    title: string,
  ): Promise<void> {
    // 确定最终要渲染的列(显式配置优先,否则取数据首行的 key)
    let cols: Array<{ header: string; key: string }>;
    if (columns.length > 0) {
      cols = columns.map((col) => ({
        header: col.header || col.key,
        key: col.key,
      }));
    } else if (data.length > 0) {
      cols = Object.keys(data[0]).map((k) => ({ header: k, key: k }));
    } else {
      cols = [];
    }

    return new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 36,
      });
      const stream = fs.createWriteStream(filePath);
      stream.on('error', reject);
      stream.on('finish', () => resolve());

      doc.pipe(stream);

      // ── 中文字体 ──
      // pdfkit 内置 Helvetica 不含 CJK 字形,中文会渲染成乱码。这里按候选路径解析一个 CJK
      // 字体;找不到则回退 Helvetica 并在 PDF 顶部加注(此时中文不可读,但不报错)。
      // 可通过环境变量 REPORT_CJK_FONT 指定字体文件路径覆盖。
      let regularFont = 'Helvetica';
      let boldFont = 'Helvetica-Bold';
      const cjk = ReportsService.resolveCjkFont();
      if (cjk) {
        try {
          // 注意:TTC 字体(如 msyh.ttc / wqy-zenhei.ttc)必须传 PostScript 名作为 family,
          // 否则 fontkit.create(buf) 返回 FontCollection(无 createSubset)→ pdfkit 渲染时报
          // "this.font.createSubset is not a function";但单 TTF 不能传名(会触发变体分支报错)。
          // psName 仅 TTC 非空,故这里 ?? undefined:TTF 不传、TTC 传。
          doc.registerFont('CJK', cjk.buf, cjk.psName ?? undefined);
          doc.registerFont('CJK-Bold', cjk.buf, cjk.psName ?? undefined); // 无独立粗体,用同字体
          regularFont = 'CJK';
          boldFont = 'CJK-Bold';
        } catch {
          /* registerFont 失败则保持 Helvetica */
        }
      }

      // ── 标题 ──
      doc
        .fontSize(16)
        .font(boldFont)
        .text(title || '报表', { align: 'center' });
      if (!cjk) {
        doc
          .fontSize(8)
          .fillColor('#b00000')
          .text(
            '提示:服务器未找到中文字体( REPORT_CJK_FONT / 系统字体),中文内容可能无法正常显示。',
            {
              align: 'center',
            },
          )
          .fillColor('#000000');
      }
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .font(regularFont)
        .text(
          `生成时间: ${new Date().toLocaleString('zh-CN')}    数据行数: ${data.length}`,
          { align: 'left' },
        );
      doc.moveDown(1);

      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

      if (cols.length === 0) {
        doc.text('（无数据）');
        doc.end();
        return;
      }

      // ── 简单等宽列表布局 ──
      const colWidth = pageWidth / cols.length;
      const rowHeight = 18;
      const headerY = doc.y;

      // 表头(灰底)
      doc
        .rect(doc.page.margins.left, headerY, pageWidth, rowHeight)
        .fill('#e8e8e8');
      doc.fillColor('#000000').fontSize(8).font(boldFont);
      cols.forEach((col, i) => {
        const x = doc.page.margins.left + i * colWidth;
        const header = this.truncate(col.header, colWidth - 6);
        doc.text(header, x + 3, headerY + 4, {
          width: colWidth - 6,
          ellipsis: true,
        });
      });

      // 数据行
      let y = headerY + rowHeight;
      doc.font(regularFont).fontSize(8);
      data.forEach((row, rowIdx) => {
        // 分页
        if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
        }
        if (rowIdx % 2 === 1) {
          doc
            .rect(doc.page.margins.left, y, pageWidth, rowHeight)
            .fill('#f6f6f6');
          doc.fillColor('#000000');
        }
        cols.forEach((col, i) => {
          const x = doc.page.margins.left + i * colWidth;
          const raw = row[col.key];
          const cell =
            raw === null || raw === undefined
              ? ''
              : raw instanceof Date
                ? raw.toLocaleString('zh-CN')
                : String(raw);
          doc.text(this.truncate(cell, colWidth - 6), x + 3, y + 4, {
            width: colWidth - 6,
            ellipsis: true,
          });
        });
        y += rowHeight;
      });

      doc.end();
    });
  }

  /** 粗略按宽度截断提示(实际渲染由 pdfkit ellipsis 处理,这里仅作下限保护) */
  private truncate(text: string, maxChars: number): string {
    if (!text) return '';
    const limit = Math.max(3, Math.floor(maxChars / 4));
    return text.length > limit ? text.slice(0, limit) : text;
  }

  /**
   * 解析一个 CJK 字体文件(pdfkit 内置字体不含中文)。顺序:REPORT_CJK_FONT 环境变量 →
   * Windows 系统字体 → Linux/Docker 常见 CJK 字体。返回 {buf, psName}:buf 是字体字节,
   * psName 是 PostScript 名(TTC 集合必须用它选字形面,否则 fontkit 返回集合、pdfkit 报
   * createSubset 错误)。找不到返回 null(调用方回退 Helvetica 并加注提示)。
   */
  private static resolveCjkFont(): {
    buf: Buffer;
    psName: string | null;
  } | null {
    const candidates = [
      process.env.REPORT_CJK_FONT,
      // Windows(开发机)
      'C:\\Windows\\Fonts\\simhei.ttf',
      'C:\\Windows\\Fonts\\msyh.ttc',
      'C:\\Windows\\Fonts\\simsun.ttc',
      // Linux/Docker(需在镜像里装 fonts-wqy-zenhei 或 fonts-noto-cjk)
      '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
      '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    ].filter((p): p is string => !!p);
    for (const p of candidates) {
      try {
        if (!fs.existsSync(p)) continue;
        // fontkit.openSync 用【路径】打开:TTF/OTF 返回单字体;TTC 返回集合(多个字形面)。
        const opened = fontkit.openSync(p);
        const fonts = (opened as { fonts?: Array<{ postscriptName: string }> })
          .fonts;
        // 关键:TTC 必须给 fontkit.create 一个 PostScript 名才能选中字形面(否则返回集合、
        // pdfkit 报 createSubset);但给【非可变 TTF】传 PostScript 名会触发 fontkit 的变体
        // 分支(报 "Variations require ... fvar/gvar/glyf/CFF2")。故:仅 TTC 传 psName。
        const psName =
          fonts && fonts.length > 0 ? fonts[0].postscriptName : null;
        return { buf: fs.readFileSync(p), psName };
      } catch {
        /* 该候选不可用,尝试下一个 */
      }
    }
    return null;
  }

  // ──── 导出日志 ────

  async findAllExportLogs(
    page?: number,
    pageSize?: number,
  ): Promise<PageResult<ReportExportLog>> {
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

  async createScheduledTask(
    dto: CreateScheduledReportTaskDto,
  ): Promise<ScheduledReportTask> {
    const entity = this.scheduledTaskRepo.create(dto);
    return this.scheduledTaskRepo.save(entity);
  }

  async updateScheduledTask(
    id: number,
    dto: UpdateScheduledReportTaskDto,
  ): Promise<ScheduledReportTask> {
    const task = await this.scheduledTaskRepo.findOneBy({ id });
    if (!task) throw new NotFoundException(`定时报表任务 #${id} 不存在`);
    Object.assign(task, dto);
    return this.scheduledTaskRepo.save(task);
  }

  async findAllScheduledTasks(): Promise<ScheduledReportTask[]> {
    return this.scheduledTaskRepo.find({ order: { id: 'ASC' } });
  }

  async removeScheduledTask(
    id: number,
  ): Promise<{ deleted: true; id: number }> {
    const task = await this.scheduledTaskRepo.findOneBy({ id });
    if (!task) throw new NotFoundException(`定时报表任务 #${id} 不存在`);
    await this.scheduledTaskRepo.delete(id);
    return { deleted: true, id };
  }
}
