import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 字典类型表：定义一类业务字典，例如密级、费用状态、审批状态 */
@Entity('dictionary_type')
export class DictionaryType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 100, comment: '字典类型编码，例如 secret_level' })
  code!: string;

  @Column({ length: 100, comment: '字典类型名称，例如 密级' })
  name!: string;

  @Column({ type: 'varchar', length: 50, default: 'business', comment: '作用域：system/business/security/integration' })
  scope!: string;

  @Column({ name: 'is_system', type: 'boolean', default: false, comment: '是否系统内置' })
  isSystem!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
