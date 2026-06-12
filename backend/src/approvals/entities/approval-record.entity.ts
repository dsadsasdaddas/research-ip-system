import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 审批记录表 —— 每次审批操作留下痕迹
 */
@Entity('approval_record')
export class ApprovalRecord {
  @PrimaryGeneratedColumn({ comment: '主键ID,自增' })
  id!: number;

  @Column({ name: 'instance_id', type: 'int', comment: '审批实例ID' })
  instanceId!: number;

  @Column({
    name: 'node_id',
    type: 'int',
    nullable: true,
    comment: '流程节点ID',
  })
  nodeId!: number | null;

  @Column({
    type: 'varchar',
    length: 30,
    comment: '操作类型:submit/approve/reject/return/add_sign/archive/cancel',
  })
  action!: string;

  @Column({ type: 'text', nullable: true, comment: '审批意见' })
  opinion!: string | null;

  @Column({
    name: 'operator_id',
    type: 'int',
    nullable: true,
    comment: '操作人用户ID',
  })
  operatorId!: number | null;

  @Column({
    type: 'varchar',
    name: 'operator_name',
    length: 100,
    nullable: true,
    comment: '操作人姓名',
  })
  operatorName!: string | null;

  @Column({
    name: 'operate_time',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '操作时间',
  })
  operateTime!: Date;

  @Column({
    name: 'next_node_id',
    type: 'int',
    nullable: true,
    comment: '下一节点ID',
  })
  nextNodeId!: number | null;

  @Column({
    name: 'attachment_id',
    type: 'int',
    nullable: true,
    comment: '附件ID',
  })
  attachmentId!: number | null;
}
