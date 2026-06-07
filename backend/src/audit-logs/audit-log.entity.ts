import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ length: 100, nullable: true, comment: '操作人用户名' })
  username!: string | null;

  @Column({ length: 100, nullable: true, comment: '操作人真名' })
  realName!: string | null;

  @Column({ length: 20, nullable: true, comment: 'HTTP 方法 POST/PATCH/DELETE' })
  method!: string | null;

  @Column({ length: 255, nullable: true, comment: '请求路径' })
  path!: string | null;

  @Column({ length: 50, nullable: true, comment: '业务模块 papers/patents/fees/...' })
  module!: string | null;

  @Column({ length: 50, nullable: true, comment: '操作动作 create/update/delete' })
  action!: string | null;

  @Column({ type: 'text', nullable: true, comment: '请求体(脱敏)' })
  requestBody!: string | null;

  @Column({ type: 'int', nullable: true, comment: 'HTTP 响应状态码' })
  statusCode!: number | null;

  @Column({ length: 50, nullable: true, comment: '客户端 IP' })
  ip!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
