import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 报表导出日志表 */
@Entity('report_export_log')
export class ReportExportLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'int',
    name: 'template_id',
    nullable: true,
    comment: '模板ID',
  })
  templateId!: number | null;

  @Column({
    type: 'varchar',
    name: 'report_type',
    length: 50,
    comment: '报表类型',
  })
  reportType!: string;

  @Column({
    type: 'varchar',
    name: 'export_format',
    length: 20,
    comment: '导出格式: xlsx/pdf/csv',
  })
  exportFormat!: string;

  @Column({
    type: 'varchar',
    name: 'file_path',
    length: 500,
    nullable: true,
    comment: '导出文件路径',
  })
  filePath!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'pending',
    comment: '状态: pending/success/failed',
  })
  status!: string;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @Column({
    type: 'int',
    name: 'user_id',
    nullable: true,
    comment: '操作用户ID',
  })
  userId!: number | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '操作用户名',
  })
  username!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @Column({
    type: 'datetime',
    name: 'finish_time',
    nullable: true,
    comment: '完成时间',
  })
  finishTime!: Date | null;
}
