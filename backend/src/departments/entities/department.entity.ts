import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('department')
export class Department {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, comment: '部门名称' })
  name!: string;

  @Column({
    name: 'parent_id',
    type: 'int',
    nullable: true,
    comment: '上级部门ID',
  })
  parentId!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  description!: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isActive!: boolean;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
