import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** RBAC角色表 */
@Entity('rbac_role')
export class RbacRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: 100, comment: '角色编码' })
  code!: string;

  @Column({ type: 'varchar', length: 100, comment: '角色名称' })
  name!: string;

  @Column({ type: 'varchar', name: 'data_scope', length: 50, default: 'dept', comment: '数据范围: self/dept/all/custom' })
  dataScope!: string;

  @Column({ type: 'boolean', name: 'is_system', default: false, comment: '是否系统内置' })
  isSystem!: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true, comment: '是否启用' })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
