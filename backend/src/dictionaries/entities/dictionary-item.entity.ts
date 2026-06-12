import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 字典项表：定义某个字典类型下的具体选项 */
@Entity('dictionary_item')
export class DictionaryItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'type_code', length: 100, comment: '所属字典类型编码' })
  typeCode!: string;

  @Column({ length: 100, comment: '显示名称' })
  label!: string;

  @Column({ length: 100, comment: '实际值' })
  value!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序号' })
  sortOrder!: number;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: '前端标签颜色',
  })
  color!: string | null;

  @Column({
    name: 'is_default',
    type: 'boolean',
    default: false,
    comment: '是否默认项',
  })
  isDefault!: boolean;

  @Column({
    name: 'is_system',
    type: 'boolean',
    default: false,
    comment: '是否系统内置',
  })
  isSystem!: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
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
