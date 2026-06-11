import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 通知消息表 */
@Entity('notification_message')
@Index('idx_notification_receiver', ['receiverId', 'isRead'])
@Index('idx_notification_source', ['sourceType', 'sourceId'])
export class NotificationMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'receiver_id', nullable: true, comment: '接收人用户ID' })
  receiverId!: number | null;

  @Column({ type: 'varchar', name: 'receiver_name', length: 100, nullable: true, comment: '接收人姓名' })
  receiverName!: string | null;

  @Column({ type: 'varchar', length: 200, comment: '通知标题' })
  title!: string;

  @Column({ type: 'text', nullable: true, comment: '通知内容' })
  content!: string | null;

  @Column({
    name: 'message_type',
    type: 'varchar',
    length: 50,
    default: 'system',
    comment: '消息类型: system/reminder/approval/report',
  })
  messageType!: string;

  @Column({ type: 'varchar', name: 'source_type', length: 50, nullable: true, comment: '来源类型' })
  sourceType!: string | null;

  @Column({ type: 'int', name: 'source_id', nullable: true, comment: '来源ID' })
  sourceId!: number | null;

  @Column({ type: 'boolean', name: 'is_read', default: false, comment: '是否已读' })
  isRead!: boolean;

  @Column({ type: 'datetime', name: 'read_time', nullable: true, comment: '已读时间' })
  readTime!: Date | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
