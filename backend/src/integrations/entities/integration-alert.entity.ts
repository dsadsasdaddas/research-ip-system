import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 接口异常告警表 */
@Entity('integration_alert')
export class IntegrationAlert {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'integration_type', length: 50, comment: '接口类型' })
  integrationType!: string;

  @Column({ type: 'varchar', name: 'alert_level', length: 20, default: 'warning', comment: '告警级别: info/warning/critical' })
  alertLevel!: string;

  @Column({ type: 'varchar', length: 200, comment: '告警标题' })
  title!: string;

  @Column({ type: 'text', nullable: true, comment: '告警内容' })
  content!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'open', comment: '状态: open/handled/ignored' })
  status!: string;

  @Column({ type: 'int', name: 'handler_id', nullable: true, comment: '处理人ID' })
  handlerId!: number | null;

  @Column({ type: 'varchar', name: 'handler_name', length: 100, nullable: true, comment: '处理人姓名' })
  handlerName!: string | null;

  @Column({ type: 'datetime', name: 'handled_time', nullable: true, comment: '处理时间' })
  handledTime!: Date | null;

  @CreateDateColumn({ name: 'create_time' })
  createTime!: Date;
}
