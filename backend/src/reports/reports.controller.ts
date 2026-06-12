import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { CreateScheduledReportTaskDto } from './dto/create-scheduled-report-task.dto';
import { UpdateScheduledReportTaskDto } from './dto/update-scheduled-report-task.dto';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  // ──── 报表模板 ────

  @Get('templates')
  findAllTemplates(@Query('reportType') reportType?: string) {
    return this.svc.findAllTemplates(reportType);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  @Post('templates')
  createTemplate(@Body() dto: CreateReportTemplateDto) {
    return this.svc.createTemplate(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  @Patch('templates/:id')
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    return this.svc.updateTemplate(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  @Delete('templates/:id')
  removeTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeTemplate(id);
  }

  // ──── 报表导出 ────

  @Post('export')
  async exportReport(
    @Body() dto: ExportReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.exportReport(dto.templateId, dto.format || 'xlsx', user);
  }

  @Get('export-logs')
  findAllExportLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAllExportLogs(
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
    );
  }

  @Get('exports/:id/download')
  async downloadExport(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const log = await this.svc.findOneExportLog(id);
    if (!log.filePath || log.status !== 'success') {
      res.status(404).json({ message: '导出文件不存在或导出未成功' });
      return;
    }
    if (!fs.existsSync(log.filePath)) {
      res.status(404).json({ message: '导出文件已被清理' });
      return;
    }
    const fileName = log.filePath.split(/[/\\]/).pop() || 'export';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    // 按扩展名给正确 MIME;csv 带 charset=utf-8,配合文件内的 UTF-8 BOM,Excel 才能正确解码中文
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const mime =
      ext === 'csv'
        ? 'text/csv; charset=utf-8'
        : ext === 'pdf'
          ? 'application/pdf'
          : ext === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    const stream = fs.createReadStream(log.filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ message: '文件读取失败' });
      }
    });
    stream.pipe(res);
  }

  // ──── 定时报表任务 ────

  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  @Get('scheduled-tasks')
  findAllScheduledTasks() {
    return this.svc.findAllScheduledTasks();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  @Post('scheduled-tasks')
  createScheduledTask(@Body() dto: CreateScheduledReportTaskDto) {
    return this.svc.createScheduledTask(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  @Patch('scheduled-tasks/:id')
  updateScheduledTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduledReportTaskDto,
  ) {
    return this.svc.updateScheduledTask(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  @Delete('scheduled-tasks/:id')
  removeScheduledTask(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeScheduledTask(id);
  }
}
