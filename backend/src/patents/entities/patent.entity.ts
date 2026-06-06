import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 专利实体 —— 对应数据库 patent 表。
 * 字段依据需求说明书:§3.1.2 专利登记 + §6.2 专利表。
 * 日期类字段用 varchar 存(YYYY-MM-DD 字符串),避免时区换算的坑,登记够用。
 */
@Entity('patent')
export class Patent {
  @PrimaryGeneratedColumn({ comment: '主键ID,自增' })
  id: number;

  // ========== 基础字段(§3.1.2)==========

  @Column({ length: 500, comment: '专利名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '院内发明人' })
  inventors: string;

  @Column({ name: 'outer_inventors', type: 'text', nullable: true, comment: '外单位发明人' })
  outerInventors: string;

  @Column({ length: 255, nullable: true, comment: '专利权人' })
  patentee: string;

  @Column({ name: 'application_no', length: 100, nullable: true, comment: '申请号' })
  applicationNo: string;

  @Column({ name: 'grant_no', length: 100, nullable: true, comment: '授权号' })
  grantNo: string;

  @Column({ name: 'filing_date', length: 20, nullable: true, comment: '申请日' })
  filingDate: string;

  @Column({ name: 'grant_date', length: 20, nullable: true, comment: '授权日' })
  grantDate: string;

  @Column({ name: 'patent_type', length: 50, nullable: true, comment: '专利类型:发明/实用新型/外观设计/PCT' })
  patentType: string;

  @Column({ length: 50, nullable: true, default: '中国', comment: '国别' })
  country: string;

  @Column({ name: 'next_fee_date', length: 20, nullable: true, comment: '年费下次缴费日' })
  nextFeeDate: string;

  @Column({
    name: 'fee_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '年费金额',
  })
  feeAmount: number;

  @Column({ length: 255, nullable: true, comment: '代理机构' })
  agency: string;

  @Column({ name: 'legal_status', length: 50, default: '申请中', comment: '法律状态:申请中/授权/失效/驳回' })
  legalStatus: string;

  // ========== 扩展字段(§3.1.2)==========

  @Column({ name: 'pct_stage', length: 100, nullable: true, comment: 'PCT国际阶段' })
  pctStage: string;

  @Column({ name: 'national_stage', length: 100, nullable: true, comment: '国家阶段' })
  nationalStage: string;

  @Column({ name: 'entry_date', length: 20, nullable: true, comment: '国际进入日期' })
  entryDate: string;

  @Column({ name: 'patent_mark', length: 50, default: '普通专利', comment: '专利标识:普通专利/国防专利/涉密专利' })
  patentMark: string;

  @Column({ name: 'depend_project', length: 255, nullable: true, comment: '课题依托项目' })
  dependProject: string;

  @Column({ name: 'fund_source', length: 100, nullable: true, comment: '经费来源' })
  fundSource: string;

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
