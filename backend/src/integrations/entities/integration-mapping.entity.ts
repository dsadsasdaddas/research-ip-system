import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 外部接口字段映射表 */
@Entity('integration_mapping')
export class IntegrationMapping {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'integration_type', length: 50, comment: '接口类型' })
  integrationType!: string;

  @Column({ type: 'varchar', name: 'business_module', length: 50, comment: '业务模块: paper/patent/user/fee' })
  businessModule!: string;

  @Column({ type: 'varchar', name: 'external_field', length: 100, comment: '外部字段' })
  externalField!: string;

  @Column({ type: 'varchar', name: 'internal_field', length: 100, comment: '内部字段' })
  internalField!: string;

  @Column({ type: 'text', name: 'transform_rule', nullable: true, comment: '字段转换规则' })
  transformRule!: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true, comment: '是否启用' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
