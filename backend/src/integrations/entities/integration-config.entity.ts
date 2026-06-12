import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IntegrationType {
  CROSSREF = 'crossref',
  SCOPUS = 'scopus',
  OPENALEX = 'openalex',
  CNIPA = 'cnipa',
  HR_LDAP = 'hr_ldap',
  FINANCE = 'finance',
  EMAIL = 'email',
  SMS = 'sms',
}

/** 外部接口配置中心：接口地址、开关、超时、重试、密钥引用等统一管理 */
@Entity('integration_config')
export class IntegrationConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: IntegrationType,
    unique: true,
    comment: '接口类型',
  })
  type!: IntegrationType;

  @Column({ length: 100, comment: '显示名称' })
  name!: string;

  @Column({
    name: 'base_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '接口基础地址',
  })
  baseUrl!: string | null;

  @Column({
    name: 'api_key_env',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'API Key 环境变量名，禁止直接存密钥',
  })
  apiKeyEnv!: string | null;

  @Column({
    name: 'is_enabled',
    type: 'boolean',
    default: false,
    comment: '是否启用',
  })
  isEnabled!: boolean;

  @Column({
    name: 'timeout_ms',
    type: 'int',
    default: 8000,
    comment: '超时时间毫秒',
  })
  timeoutMs!: number;

  @Column({
    name: 'retry_count',
    type: 'int',
    default: 3,
    comment: '失败重试次数',
  })
  retryCount!: number;

  @Column({
    name: 'fallback_mode',
    length: 50,
    default: 'manual',
    comment: '降级模式：manual/mock/disabled',
  })
  fallbackMode!: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON 扩展配置' })
  extra!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;

  @UpdateDateColumn({ name: 'update_time' })
  updateTime!: Date;
}
