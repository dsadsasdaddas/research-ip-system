import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 审批实例表 —— 每次提交审批生成一条记录
 */
@Entity('approval_instance')
export class ApprovalInstance {
  @PrimaryGeneratedColumn({ comment: '主键ID,自增' })
  id!: number;

  @Column({ name: 'flow_id', type: 'int', comment: '关联流程ID' })
  flowId!: number;

  @Column({
    type: 'varchar',
    name: 'business_type',
    length: 50,
    comment: '业务类型:paper/patent/copyright/transform/fee/secret',
  })
  businessType!: string;

  @Column({ name: 'business_id', type: 'int', comment: '业务数据ID' })
  businessId!: number;

  @Column({ type: 'varchar', length: 200, comment: '审批标题' })
  title!: string;

  @Column({
    name: 'submit_user_id',
    type: 'int',
    nullable: true,
    comment: '提交人用户ID',
  })
  submitUserId!: number | null;

  @Column({
    type: 'varchar',
    name: 'submit_username',
    length: 100,
    nullable: true,
    comment: '提交人用户名',
  })
  submitUsername!: string | null;

  @Column({
    name: 'dept_id',
    type: 'int',
    nullable: true,
    comment: '所属部门ID',
  })
  deptId!: number | null;

  @Column({
    name: 'current_node_id',
    type: 'int',
    nullable: true,
    comment: '当前待审批节点ID',
  })
  currentNodeId!: number | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'pending',
    comment: '状态:pending/approved/rejected/cancelled/archived',
  })
  status!: string;

  @Column({
    name: 'submit_time',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '提交时间',
  })
  submitTime!: Date;

  @Column({
    name: 'finish_time',
    type: 'datetime',
    nullable: true,
    comment: '完成时间',
  })
  finishTime!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;
}
