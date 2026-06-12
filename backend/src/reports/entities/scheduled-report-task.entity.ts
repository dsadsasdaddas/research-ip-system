import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 定时报表任务表 */
@Entity('scheduled_report_task')
export class ScheduledReportTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'template_id', comment: '模板ID' })
  templateId!: number;

  @Column({
    type: 'varchar',
    name: 'task_name',
    length: 100,
    comment: '任务名称',
  })
  taskName!: string;

  @Column({
    type: 'varchar',
    name: 'cron_expr',
    length: 100,
    comment: '定时表达式',
  })
  cronExpr!: string;

  @Column({ type: 'text', nullable: true, comment: '接收人JSON' })
  receivers!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'email',
    comment: '发送渠道: site/email',
  })
  channel!: string;

  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
    comment: '是否启用',
  })
  isActive!: boolean;

  @Column({
    type: 'datetime',
    name: 'last_run_time',
    nullable: true,
    comment: '上次运行时间',
  })
  lastRunTime!: Date | null;

  @Column({
    type: 'datetime',
    name: 'next_run_time',
    nullable: true,
    comment: '下次运行时间',
  })
  nextRunTime!: Date | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
