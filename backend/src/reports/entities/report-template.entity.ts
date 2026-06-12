import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 报表模板表 */
@Entity('report_template')
export class ReportTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: 100, comment: '模板编码' })
  code!: string;

  @Column({ type: 'varchar', length: 100, comment: '模板名称' })
  name!: string;

  @Column({
    type: 'varchar',
    name: 'report_type',
    length: 50,
    comment: '报表类型: paper/patent/fee/transform/custom',
  })
  reportType!: string;

  @Column({
    type: 'text',
    name: 'config_json',
    nullable: true,
    comment: '报表配置JSON',
  })
  configJson!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'dept',
    comment: '作用域: personal/dept/all',
  })
  scope!: string;

  @Column({
    type: 'boolean',
    name: 'is_active',
    default: true,
    comment: '是否启用',
  })
  isActive!: boolean;

  @Column({ type: 'varchar', name: 'create_user', length: 100, nullable: true })
  createUser!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
