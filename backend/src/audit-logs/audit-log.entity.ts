import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 操作审计日志表 §7.4
 * 记录所有写操作（POST/PATCH/PUT/DELETE），不可删除。
 */
@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '操作人用户名',
  })
  username!: string | null;

  @Column({
    name: 'real_name',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '操作人真名',
  })
  realName!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'HTTP 方法 POST/PATCH/DELETE',
  })
  method!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '请求路径' })
  path!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '业务模块 papers/patents/fees/...',
  })
  module!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '操作动作 create/update/delete',
  })
  action!: string | null;

  @Column({
    name: 'body',
    type: 'text',
    nullable: true,
    comment: '请求体(脱敏)',
  })
  requestBody!: string | null;

  @Column({
    name: 'status_code',
    type: 'int',
    nullable: true,
    comment: 'HTTP 响应状态码',
  })
  statusCode!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '客户端 IP' })
  ip!: string | null;

  // ========== §6.2 字段级变更日志(与上面的 HTTP 级日志共存,均允许 NULL) ==========
  @Column({
    name: 'operate_type',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '操作类型:create/update/delete',
  })
  operateType!: string | null;

  @Column({
    name: 'table_name',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '变更的表名:paper/patent/...',
  })
  tableName!: string | null;

  @Column({
    name: 'record_id',
    type: 'int',
    nullable: true,
    comment: '变更的记录主键',
  })
  recordId!: number | null;

  @Column({
    name: 'old_value',
    type: 'json',
    nullable: true,
    comment: '变更前的行(更新/删除)',
  })
  oldValue!: Record<string, unknown> | null;

  @Column({
    name: 'new_value',
    type: 'json',
    nullable: true,
    comment: '变更后的行(更新)',
  })
  newValue!: Record<string, unknown> | null;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '字段级日志的来源 IP(尽力而为,subscriber 上下文可能为 NULL)',
  })
  ipAddress!: string | null;

  @Column({
    name: 'operate_time',
    type: 'datetime',
    nullable: true,
    comment: '字段级变更发生时间',
  })
  operateTime!: Date | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
