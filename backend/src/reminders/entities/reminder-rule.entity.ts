import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 提醒规则表 —— 管理员配置，自动生成提醒任务 */
@Entity('reminder_rule')
export class ReminderRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200, comment: '提醒事项名称' })
  title!: string;

  @Column({ type: 'varchar', name: 'remind_type', length: 50, nullable: true, comment: '类型: 项目申报/奖项申报/专利年费/软著维护/成果转化后评估/涉密成果核查' })
  remindType!: string | null;

  @Column({ name: 'deadline', type: 'date', nullable: true, comment: '截止日期' })
  deadline!: string | null;

  @Column({ name: 'days_before', type: 'int', default: 30, comment: '提前几天提醒' })
  daysBefore!: number;

  @Column({ type: 'varchar', name: 'remind_level', length: 20, default: '普通', comment: '紧急等级: 普通/重要/紧急' })
  remindLevel!: string;

  @Column({ name: 'dept_id', type: 'int', nullable: true, comment: '责任部门' })
  deptId!: number | null;

  @Column({ name: 'receiver_ids', type: 'text', nullable: true, comment: '责任人ID列表 JSON' })
  receiverIds!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
