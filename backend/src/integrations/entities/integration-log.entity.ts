import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IntegrationType } from './integration-config.entity';

/** 外部接口调用日志：记录成功率、耗时、错误，供运维监控和告警使用 */
@Entity('integration_log')
export class IntegrationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: IntegrationType, comment: '接口类型' })
  type!: IntegrationType;

  @Column({
    length: 100,
    comment: '动作，例如 doi_lookup / test / sync_patent_status',
  })
  action!: string;

  @Column({ name: 'request_url', type: 'varchar', length: 800, nullable: true })
  requestUrl!: string | null;

  @Column({ name: 'success', type: 'boolean', default: false })
  success!: boolean;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({ name: 'elapsed_ms', type: 'int', nullable: true })
  elapsedMs!: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'fallback_used', type: 'boolean', default: false })
  fallbackUsed!: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'JSON 摘要，不能存敏感密钥',
  })
  summary!: string | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
