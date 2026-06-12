import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 附件访问日志表：记录附件的预览/下载/删除等操作 */
@Entity('attachment_access_log')
export class AttachmentAccessLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'attachment_id', comment: '附件ID' })
  attachmentId!: number;

  @Column({
    type: 'int',
    name: 'version_id',
    nullable: true,
    comment: '版本ID',
  })
  versionId!: number | null;

  @Column({ type: 'int', name: 'user_id', nullable: true, comment: '用户ID' })
  userId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '用户名' })
  username!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    comment: '操作: preview/download/delete',
  })
  action!: string;

  @Column({ type: 'boolean', default: true, comment: '是否成功' })
  success!: boolean;

  @Column({ type: 'varchar', name: 'ip_address', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
