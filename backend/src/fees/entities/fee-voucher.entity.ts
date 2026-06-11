import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 缴费凭证表 —— 关联缴费记录与附件凭证。
 */
@Entity('fee_voucher')
export class FeeVoucher {
  @PrimaryGeneratedColumn({ comment: '主键ID' })
  id!: number;

  @Column({ name: 'payment_record_id', type: 'int', comment: '关联缴费记录ID' })
  paymentRecordId!: number;

  @Column({
    name: 'voucher_no',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '凭证编号',
  })
  voucherNo!: string | null;

  @Column({
    name: 'attachment_id',
    type: 'int',
    nullable: true,
    comment: '附件ID',
  })
  attachmentId!: number | null;

  @Column({
    name: 'voucher_type',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '凭证类型',
  })
  voucherType!: string | null;

  @Column({
    name: 'archive_status',
    type: 'varchar',
    length: 30,
    default: 'archived',
    comment: '归档状态',
  })
  archiveStatus!: string;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime!: Date;
}
