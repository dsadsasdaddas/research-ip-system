import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 角色枚举 —— 对应 §2 用户角色表
 */
export enum UserRole {
  RESEARCHER   = 'researcher',       // 科研人员：只看本人成果
  DEPT_SEC     = 'dept_secretary',   // 科研秘书：管本部门数据
  DEPT_ADMIN   = 'dept_admin',       // 部门管理员：本部门只读+配置
  LEADER       = 'leader',           // 主管/院领导：查看全院
  SECRET_ADMIN = 'secret_admin',     // 涉密成果管理员
  AUDITOR      = 'auditor',          // 内审/审计：全只读
  SYS_ADMIN    = 'sys_admin',        // 系统管理员：最高权限
}

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50, comment: '登录用户名' })
  username!: string;

  @Column({ length: 255, comment: '密码哈希(bcrypt)' })
  password!: string;

  @Column({ type: 'varchar', name: 'real_name', length: 50, nullable: true, comment: '真实姓名' })
  realName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '邮箱' })
  email!: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RESEARCHER,
    comment: '角色',
  })
  role!: UserRole;

  @Column({ name: 'dept_id', type: 'int', nullable: true, comment: '所属部门ID' })
  deptId!: number | null;

  @Column({ name: 'is_active', default: true, comment: '是否启用' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
