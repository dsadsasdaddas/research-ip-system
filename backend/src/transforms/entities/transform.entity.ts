import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 成果转化项目表 —— §3.2 成果转化跟踪 + §6.2 转化项目表。
 * 通过 result_type + result_id 关联论文/专利/软著三类成果。
 */
@Entity('transform')
export class Transform {
  @PrimaryGeneratedColumn({ comment: '主键ID' })
  id!: number;

  // ========== 关联成果 ==========

  @Column({ type: 'varchar', name: 'result_type', length: 20, nullable: true, comment: '成果类型:paper/patent/copyright' })
  resultType!: string | null;

  @Column({ name: 'result_id', type: 'int', nullable: true, comment: '关联成果ID' })
  resultId!: number | null;

  // ========== 合同基础信息 ==========

  @Column({ type: 'varchar', name: 'contract_no', length: 100, nullable: true, comment: '合同编号' })
  contractNo!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '交易对方' })
  partner!: string | null;

  @Column({
    name: 'contract_amount',
    type: 'decimal', precision: 14, scale: 2,
    nullable: true, comment: '合同金额(元)',
  })
  contractAmount!: number | null;

  @Column({
    name: 'received_amount',
    type: 'decimal', precision: 14, scale: 2,
    nullable: true, default: 0, comment: '已到账金额(元)',
  })
  receivedAmount!: number | null;

  @Column({ type: 'varchar', name: 'transform_date', length: 20, nullable: true, comment: '转化日期(YYYY-MM-DD)' })
  transformDate!: string | null;

  // ========== 转化类型 §3.2 ==========

  @Column({
    type: 'varchar',
    name: 'transform_type',
    length: 50,
    nullable: true,
    comment: '转化类型:技术转让/独占许可/排他许可/普通许可/作价入股',
  })
  transformType!: string | null;

  // ========== 节点跟踪 §3.2 ==========

  @Column({
    name: 'finish_status',
    length: 50,
    default: '合同签订',
    comment: '当前节点:合同签订/收款/开票/完成/合同中止/转化失败/合同作废',
  })
  finishStatus!: string;

  @Column({ name: 'abnormal_reason', type: 'text', nullable: true, comment: '异常原因(中止/失败/作废时必填)' })
  abnormalReason!: string | null;

  // ========== 收益分配 §3.2 ==========

  @Column({ type: 'varchar', name: 'distribute_ratio', length: 255, nullable: true, comment: '收益分配比例描述(院内/团队/个人)' })
  distributeRatio!: string | null;

  // ========== 归属 ==========

  @Column({ name: 'dept_id', type: 'int', nullable: true, comment: '所属部门ID' })
  deptId!: number | null;

  @Column({ type: 'varchar', name: 'create_user', length: 100, nullable: true, comment: '登记人' })
  createUser!: string | null;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime!: Date;
}
