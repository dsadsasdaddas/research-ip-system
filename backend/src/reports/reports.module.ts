import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportExportLog } from './entities/report-export-log.entity';
import { ScheduledReportTask } from './entities/scheduled-report-task.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReportTemplate, ReportExportLog, ScheduledReportTask])],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
