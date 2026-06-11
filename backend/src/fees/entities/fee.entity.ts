import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 知识产权费用台账表 —— §3.3 知识产权费用管理 + §6.2 费用表。
 * 通过 relation_type + relation_id 关联专利/软著。
 */
@Entity('fee')
export class Fee {
  @PrimaryGeneratedColumn({ comment: '主键ID' })
  id!: number;

  @Column({ type: 'varchar', name: 'relation_type', length: 20, nullable: true, comment: '关联类型: patent / copyright' })
  relationType!: string | null;

  @Column({ name: 'relation_id', type: 'int', nullable: true, comment: '关联成果ID' })
  relationId!: number | null;

  @Column({ type: 'varchar', name: 'relation_name', length: 255, nullable: true, comment: '关联成果名称(冗余,方便列表展示)' })
  relationName!: string | null;

  @Column({ type: 'varchar', name: 'fee_type', length: 50, nullable: true, comment: '费用类型: 申请费/年费/代理费/维持费/复审费' })
  feeType!: string | null;

  @Column({ type: 'varchar', name: 'fund_source', length: 50, nullable: true, comment: '经费来源: 院内经费/纵向课题/横向课题/外协资助' })
  fundSource!: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, comment: '金额(元)' })
  amount!: number | null;

  @Column({ name: 'due_date', type: 'varchar', length: 20, nullable: true, comment: '截止缴费日(YYYY-MM-DD)' })
  dueDate!: string | null;

  @Column({ name: 'paid_date', type: 'varchar', length: 20, nullable: true, comment: '实际缴费日(YYYY-MM-DD)' })
  paidDate!: string | null;

  @Column({ type: 'varchar', name: 'voucher_no', length: 100, nullable: true, comment: '凭证编号' })
  voucherNo!: string | null;

  @Column({ type: 'varchar', name: 'pay_status', length: 20, default: 'pending', comment: 'pending/paid/overdue/cancelled' })
  payStatus!: string;

  @Column({ type: 'varchar', name: 'approval_status', length: 30, default: 'draft', comment: '缴费审批状态' })
  approvalStatus!: string;

  @Column({ type: 'varchar', nullable: true, comment: '备注' })
  remark!: string | null;

  @Column({ name: 'dept_id', type: 'int', nullable: true, comment: '所属部门ID' })
  deptId!: number | null;

  @Column({ type: 'varchar', name: 'create_user', length: 100, nullable: true, comment: '登记人用户名' })
  createUser!: string | null;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime!: Date;
}
