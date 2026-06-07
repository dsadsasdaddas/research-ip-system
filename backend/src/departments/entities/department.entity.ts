import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('department')
export class Department {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, comment: '部门名称' })
  name!: string;

  @Column({ name: 'parent_id', type: 'int', nullable: true, comment: '上级部门ID' })
  parentId!: number | null;

  @Column({ length: 255, nullable: true, comment: '备注' })
  description!: string | null;
}
