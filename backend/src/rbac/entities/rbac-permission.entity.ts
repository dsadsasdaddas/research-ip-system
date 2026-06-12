import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** RBAC权限表 */
@Entity('rbac_permission')
export class RbacPermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: 150, comment: '权限编码' })
  code!: string;

  @Column({ type: 'varchar', length: 100, comment: '权限名称' })
  name!: string;

  @Column({ type: 'varchar', length: 100, comment: '所属模块' })
  module!: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '动作: read/create/update/delete/export/approve',
  })
  action!: string;

  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
    comment: '是否启用',
  })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
