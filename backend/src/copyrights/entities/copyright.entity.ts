import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 软件著作权实体 —— 对应数据库 copyright 表。
 * 字段依据需求说明书:§3.1.3 软著登记 + §6.2 软著表。
 */
@Entity('copyright')
export class Copyright {
  @PrimaryGeneratedColumn({ comment: '主键ID,自增' })
  id: number;

  // ========== 基础字段(§3.1.3)==========

  @Column({ length: 500, comment: '软著名称' })
  name: string;

  @Column({ name: 'copyright_owner', length: 255, nullable: true, comment: '著作权人' })
  copyrightOwner: string;

  @Column({ name: 'registration_no', length: 100, nullable: true, comment: '登记号' })
  registrationNo: string;

  @Column({ name: 'publish_date', length: 20, nullable: true, comment: '首次发表日期' })
  publishDate: string;

  @Column({ name: 'register_date', length: 20, nullable: true, comment: '登记日期' })
  registerDate: string;

  @Column({ length: 50, nullable: true, comment: '版本号' })
  version: string;

  @Column({ name: 'software_type', length: 50, nullable: true, comment: '软件类别' })
  softwareType: string;

  // ========== 扩展字段(§3.1.3)==========

  @Column({ name: 'software_intro', type: 'text', nullable: true, comment: '软件功能简介' })
  softwareIntro: string;

  @Column({ name: 'run_env', length: 255, nullable: true, comment: '运行环境' })
  runEnv: string;

  @Column({ name: 'cooperate_unit', length: 255, nullable: true, comment: '合作单位' })
  cooperateUnit: string;

  @Column({ name: 'depend_project', length: 255, nullable: true, comment: '依托项目' })
  dependProject: string;

  // ========== 归属与审计(§6.2 + §2 部门数据隔离)==========

  @Column({ name: 'secret_level', length: 20, default: '公开', comment: '密级:公开/内部/涉密' })
  secretLevel: string;

  @Column({ name: 'dept_id', type: 'int', nullable: true, comment: '所属部门ID(用于部门数据隔离)' })
  deptId: number;

  @Column({ name: 'create_user', length: 100, nullable: true, comment: '登记人' })
  createUser: string;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间(自动填)' })
  createTime: Date;
}
