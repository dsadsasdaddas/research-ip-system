import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 审批流程定义表 —— 管理员配置审批流程模板
 */
@Entity('approval_flow')
export class ApprovalFlow {
  @PrimaryGeneratedColumn({ comment: '主键ID,自增' })
  id!: number;

  @Column({ type: 'varchar', name: 'flow_code', length: 100, unique: true, comment: '流程编码,唯一' })
  flowCode!: string;

  @Column({ type: 'varchar', name: 'flow_name', length: 100, comment: '流程名称' })
  flowName!: string;

  @Column({ type: 'varchar', name: 'business_type', length: 50, comment: '业务类型:paper/patent/copyright/transform/fee/secret' })
  businessType!: string;

  @Column({ type: 'varchar', name: 'secret_level', length: 20, nullable: true, comment: '密级筛选(可选)' })
  secretLevel!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive!: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false, comment: '是否系统内置(不可删除)' })
  isSystem!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime!: Date;
}
