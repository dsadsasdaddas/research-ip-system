import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 提醒任务表 §6.2 */
@Entity('reminder_task')
export class ReminderTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200, comment: '提醒标题' })
  title!: string;

  @Column({ type: 'varchar', name: 'target_type', length: 50, nullable: true, comment: 'paper/patent/copyright/transform/rule' })
  targetType!: string | null;

  @Column({ name: 'target_id', type: 'int', nullable: true, comment: '关联ID' })
  targetId!: number | null;

  @Column({ name: 'remind_date', type: 'varchar', length: 20, nullable: true, comment: '提醒日期(YYYY-MM-DD)' })
  remindDate!: string | null;

  @Column({ name: 'deadline', type: 'varchar', length: 20, nullable: true, comment: '事项截止日(YYYY-MM-DD)' })
  deadline!: string | null;

  @Column({ type: 'varchar', name: 'remind_level', length: 20, default: '普通', comment: '紧急等级: 普通/重要/紧急' })
  remindLevel!: string;

  @Column({ name: 'receiver_id', type: 'int', nullable: true, comment: '接收人用户ID' })
  receiverId!: number | null;

  @Column({ type: 'varchar', name: 'receiver_name', length: 100, nullable: true })
  receiverName!: string | null;

  @Column({ name: 'dept_id', type: 'int', nullable: true })
  deptId!: number | null;

  @Column({ name: 'is_sent', type: 'boolean', default: false, comment: '是否已发送通知' })
  isSent!: boolean;

  @Column({ name: 'is_confirm', type: 'boolean', default: false, comment: '是否已确认回执' })
  isConfirm!: boolean;

  @Column({ name: 'confirm_time', type: 'datetime', nullable: true })
  confirmTime!: Date | null;

  @Column({ name: 'second_remind_sent', type: 'boolean', default: false, comment: '是否已二次催办' })
  secondRemindSent!: boolean;

  @Column({ name: 'second_remind_time', type: 'datetime', nullable: true })
  secondRemindTime!: Date | null;

  @Column({ name: 'rule_id', type: 'int', nullable: true, comment: '来源规则ID' })
  ruleId!: number | null;

  @Column({ type: 'text', nullable: true })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
