import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 缴费记录表 —— 记录每笔实际缴费信息。
 */
@Entity('fee_payment_record')
export class FeePaymentRecord {
  @PrimaryGeneratedColumn({ comment: '主键ID' })
  id!: number;

  @Column({ name: 'fee_id', type: 'int', comment: '关联费用ID' })
  feeId!: number;

  @Column({
    name: 'payment_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    comment: '缴费金额(元)',
  })
  paymentAmount!: number;

  @Column({
    name: 'payment_date',
    type: 'varchar',
    length: 20,
    comment: '缴费日期(YYYY-MM-DD)',
  })
  paymentDate!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '缴费人' })
  payer!: string | null;

  @Column({
    name: 'finance_status',
    type: 'varchar',
    length: 30,
    default: 'pending',
    comment: '财务确认状态: pending / confirmed / rejected',
  })
  financeStatus!: string;

  @Column({
    name: 'finance_voucher_no',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '财务凭证编号',
  })
  financeVoucherNo!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime!: Date;
}
