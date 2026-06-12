import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 涉密访问授权表 */
@Entity('secret_access_grant')
export class SecretAccessGrant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    name: 'business_type',
    length: 50,
    comment: '业务类型: paper/patent/copyright/attachment',
  })
  businessType!: string;

  @Column({ type: 'int', name: 'business_id', comment: '业务ID' })
  businessId!: number;

  @Column({ type: 'int', name: 'grant_user_id', comment: '被授权用户ID' })
  grantUserId!: number;

  @Column({
    type: 'varchar',
    name: 'grant_username',
    length: 100,
    nullable: true,
    comment: '被授权用户名',
  })
  grantUsername!: string | null;

  @Column({
    type: 'varchar',
    name: 'grant_scope',
    length: 50,
    default: 'read',
    comment: '授权范围: read/download/manage',
  })
  grantScope!: string;

  @Column({
    type: 'datetime',
    name: 'start_time',
    nullable: true,
    comment: '授权开始时间',
  })
  startTime!: Date | null;

  @Column({
    type: 'datetime',
    name: 'end_time',
    nullable: true,
    comment: '授权结束时间',
  })
  endTime!: Date | null;

  @Column({
    type: 'varchar',
    name: 'grant_reason',
    length: 255,
    nullable: true,
    comment: '授权原因',
  })
  grantReason!: string | null;

  @Column({
    type: 'int',
    name: 'granted_by',
    nullable: true,
    comment: '授权人ID',
  })
  grantedBy!: number | null;

  @Column({
    type: 'varchar',
    name: 'granted_by_name',
    length: 100,
    nullable: true,
    comment: '授权人姓名',
  })
  grantedByName!: string | null;

  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
    comment: '是否有效',
  })
  isActive!: boolean;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
