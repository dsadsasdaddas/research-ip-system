import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 搜索日志表
 * 记录每次搜索的关键词、类型、结果数、耗时等信息。
 */
@Entity('search_log')
export class SearchLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, comment: '搜索关键词' })
  keyword!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '搜索类型，如 paper,patent' })
  types!: string | null;

  @Column({ name: 'result_count', type: 'int', default: 0, comment: '结果数量' })
  resultCount!: number;

  @Column({ name: 'elapsed_ms', type: 'decimal', precision: 12, scale: 3, nullable: true, comment: '搜索耗时(ms)' })
  elapsedMs!: number | null;

  @Column({ type: 'varchar', length: 50, default: 'rust', comment: '搜索引擎' })
  engine!: string;

  @Column({ name: 'user_id', type: 'int', nullable: true, comment: '操作用户ID' })
  userId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '操作用户名' })
  username!: string | null;

  @Column({ name: 'dept_id', type: 'int', nullable: true, comment: '所属部门ID' })
  deptId!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '客户端IP' })
  ip!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
