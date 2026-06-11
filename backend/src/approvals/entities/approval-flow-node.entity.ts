import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * 审批流程节点表 —— 流程中的每个审批环节
 */
@Entity('approval_flow_node')
@Unique('UQ_flow_node_code', ['flowId', 'nodeCode'])
export class ApprovalFlowNode {
  @PrimaryGeneratedColumn({ comment: '主键ID,自增' })
  id!: number;

  @Column({ name: 'flow_id', type: 'int', comment: '所属流程ID' })
  flowId!: number;

  @Column({ type: 'varchar', name: 'node_code', length: 100, comment: '节点编码' })
  nodeCode!: string;

  @Column({ type: 'varchar', name: 'node_name', length: 100, comment: '节点名称' })
  nodeName!: string;

  @Column({ name: 'node_order', type: 'int', default: 1, comment: '节点排序(从小到大执行)' })
  nodeOrder!: number;

  @Column({ type: 'varchar', name: 'approver_role', length: 100, nullable: true, comment: '审批角色' })
  approverRole!: string | null;

  @Column({ name: 'approver_user_id', type: 'int', nullable: true, comment: '指定审批人用户ID' })
  approverUserId!: number | null;

  @Column({ type: 'varchar', name: 'approve_mode', length: 30, default: 'single', comment: '审批模式:single/countersign/orsign' })
  approveMode!: string;

  @Column({ name: 'allow_reject', type: 'boolean', default: true, comment: '是否允许驳回' })
  allowReject!: boolean;

  @Column({ name: 'allow_add_sign', type: 'boolean', default: false, comment: '是否允许加签' })
  allowAddSign!: boolean;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime!: Date;
}
