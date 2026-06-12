import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 通知发送日志表 */
@Entity('notification_send_log')
export class NotificationSendLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'int',
    name: 'message_id',
    nullable: true,
    comment: '通知消息ID',
  })
  messageId!: number | null;

  @Column({ type: 'varchar', length: 30, comment: '发送渠道: email/sms/site' })
  channel!: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '接收人地址(邮箱/手机号等)',
  })
  receiver!: string | null;

  @Column({ type: 'boolean', default: false, comment: '是否发送成功' })
  success!: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '发送服务商',
  })
  provider!: string | null;

  @Column({
    type: 'text',
    name: 'error_message',
    nullable: true,
    comment: '错误信息',
  })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'send_time' })
  sendTime!: Date;
}
