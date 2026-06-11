import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 论文实体 —— 对应数据库 paper 表。
 * 字段严格依据需求说明书:§3.1.1 论文登记 + §6.2 论文表。
 * (这里写的"实体类",TypeORM 会据此自动在 MySQL 里建出对应的表)
 */
@Entity('paper')
export class Paper {
  @PrimaryGeneratedColumn({ comment: '主键ID,自增' })
  id!: number;

  // ========== 基础字段(§3.1.1)==========

  @Column({ length: 500, comment: '论文标题' })
  title!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true, comment: 'DOI;唯一——§3.1.1 同一DOI只能登记一条' })
  doi!: string | null;

  @Column({ type: 'varchar', name: 'first_author', length: 100, nullable: true, comment: '第一作者' })
  firstAuthor!: string | null;

  @Column({ type: 'varchar', name: 'corresponding_author', length: 100, nullable: true, comment: '通讯作者' })
  correspondingAuthor!: string | null;

  @Column({ type: 'text', nullable: true, comment: '院内作者列表' })
  authors!: string | null;

  @Column({ name: 'outer_authors', type: 'text', nullable: true, comment: '外单位合作作者' })
  outerAuthors!: string | null;

  @Column({ type: 'varchar', name: 'cooperate_unit', length: 255, nullable: true, comment: '合作单位' })
  cooperateUnit!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '期刊名称' })
  journal!: string | null;

  @Column({ type: 'varchar', name: 'issn_cn', length: 50, nullable: true, comment: 'ISSN/CN 号' })
  issnCn!: string | null;

  @Column({ type: 'varchar', name: 'volume_page', length: 100, nullable: true, comment: '卷期页码' })
  volumePage!: string | null;

  @Column({ name: 'publish_year', type: 'int', nullable: true, comment: '发表年份' })
  publishYear!: number | null;

  @Column({
    name: 'impact_factor',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
    comment: '影响因子',
  })
  impactFactor!: number | null;

  @Column({ name: 'citation_count', type: 'int', default: 0, comment: '被引次数' })
  citationCount!: number | null;

  @Column({ type: 'varchar', name: 'included_type', length: 50, nullable: true, comment: '收录情况:SCI/EI/CSCD 等' })
  includedType!: string | null;

  // 注:§6.2 字段名为 partition,但它是 MySQL 保留字,故列名用 cas_partition,属性名保持 partition
  @Column({ type: 'varchar', name: 'cas_partition', length: 20, nullable: true, comment: '中科院分区(§6.2 partition)' })
  partition!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '成果状态:在线发表/正式出版' })
  status!: string | null;

  // 注:属性名用 summary,避开 TS 关键字 abstract;数据库列名仍为 abstract(贴合 §6.2)
  @Column({ name: 'abstract', type: 'text', nullable: true, comment: '摘要' })
  summary!: string | null;

  // ========== 扩展字段(§3.1.1)==========

  @Column({ type: 'varchar', name: 'secret_level', length: 20, default: '公开', comment: '密级:公开/内部/涉密' })
  secretLevel!: string | null;

  @Column({ type: 'varchar', name: 'depend_project', length: 255, nullable: true, comment: '课题依托项目' })
  dependProject!: string | null;

  // ========== 归属与审计(§6.2 + §2 部门数据隔离)==========

  @Column({ name: 'dept_id', type: 'int', nullable: true, comment: '所属部门ID(用于部门数据隔离)' })
  deptId!: number | null;

  @Column({ type: 'varchar', name: 'create_user', length: 100, nullable: true, comment: '登记人' })
  createUser!: string | null;

  // ========== 审批与归档 ==========

  @Column({ type: 'varchar', name: 'approval_status', length: 30, default: 'draft', comment: '审批状态:draft/submitted/approved/rejected/archived' })
  approvalStatus!: string;

  @Column({ type: 'varchar', name: 'archive_status', length: 30, default: 'normal', comment: '归档状态:normal/archived/cancelled' })
  archiveStatus!: string;

  @Column({ type: 'text', name: 'cancel_reason', nullable: true, comment: '注销/作废原因' })
  cancelReason!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false, comment: '软删除标记' })
  isDeleted!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间(自动填)' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间(自动填)' })
  updateTime!: Date;
}
