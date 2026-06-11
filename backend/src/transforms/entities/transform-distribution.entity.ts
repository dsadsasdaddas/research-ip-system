import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 成果转化收益分配记录表。
 * 记录每次分配的院内/团队/个人比例及实际金额。
 */
@Entity('transform_distribution')
export class TransformDistribution {
  @PrimaryGeneratedColumn({ comment: '主键ID' })
  id!: number;

  @Column({ name: 'transform_id', type: 'int', comment: '关联转化项目ID' })
  transformId!: number;

  @Column({
    name: 'inner_ratio',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
    comment: '院内分配比例(%)',
  })
  innerRatio!: number | null;

  @Column({
    name: 'team_ratio',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
    comment: '团队分配比例(%)',
  })
  teamRatio!: number | null;

  @Column({
    name: 'personal_ratio',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
    comment: '个人分配比例(%)',
  })
  personalRatio!: number | null;

  @Column({
    name: 'actual_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    comment: '实际分配金额(元)',
  })
  actualAmount!: number | null;

  @Column({
    name: 'voucher_attachment_id',
    type: 'int',
    nullable: true,
    comment: '凭证附件ID',
  })
  voucherAttachmentId!: number | null;

  @CreateDateColumn({ name: 'record_time', comment: '记录时间' })
  recordTime!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;
}
