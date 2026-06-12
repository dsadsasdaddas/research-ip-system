import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 角色权限关联表 */
@Entity('rbac_role_permission')
export class RbacRolePermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    name: 'role_code',
    length: 100,
    comment: '角色编码',
  })
  roleCode!: string;

  @Column({
    type: 'varchar',
    name: 'permission_code',
    length: 150,
    comment: '权限编码',
  })
  permissionCode!: string;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
