import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 涉密访问日志表 */
@Entity('secret_access_log')
export class SecretAccessLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'grant_id', nullable: true, comment: '授权ID' })
  grantId!: number | null;

  @Column({
    type: 'varchar',
    name: 'business_type',
    length: 50,
    comment: '业务类型',
  })
  businessType!: string;

  @Column({ type: 'int', name: 'business_id', comment: '业务ID' })
  businessId!: number;

  @Column({ type: 'int', name: 'user_id', nullable: true, comment: '用户ID' })
  userId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '用户名' })
  username!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '操作: view/download/preview/export',
  })
  action!: string;

  @Column({ type: 'boolean', default: true, comment: '是否成功' })
  success!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '客户端IP' })
  ip!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '原因/备注',
  })
  reason!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
