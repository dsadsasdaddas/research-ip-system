import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 数据库备份恢复日志表 */
@Entity('backup_log')
export class BackupLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    name: 'backup_type',
    length: 30,
    comment: '备份类型: auto/manual',
  })
  backupType!: string;

  @Column({
    type: 'varchar',
    name: 'file_path',
    length: 500,
    nullable: true,
    comment: '备份文件路径',
  })
  filePath!: string | null;

  @Column({
    type: 'bigint',
    name: 'file_size',
    nullable: true,
    comment: '文件大小',
  })
  fileSize!: number | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'pending',
    comment: '状态: pending/success/failed/restored',
  })
  status!: string;

  @Column({
    type: 'datetime',
    name: 'started_at',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '开始时间',
  })
  startedAt!: Date;

  @Column({
    type: 'datetime',
    name: 'finished_at',
    nullable: true,
    comment: '完成时间',
  })
  finishedAt!: Date | null;

  @Column({
    type: 'int',
    name: 'operator_id',
    nullable: true,
    comment: '操作人ID',
  })
  operatorId!: number | null;

  @Column({
    type: 'varchar',
    name: 'operator_name',
    length: 100,
    nullable: true,
    comment: '操作人姓名',
  })
  operatorName!: string | null;

  @Column({
    type: 'text',
    name: 'error_message',
    nullable: true,
    comment: '错误信息',
  })
  errorMessage!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;
}
