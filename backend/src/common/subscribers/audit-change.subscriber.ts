import { Logger } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditLog } from '../../audit-logs/audit-log.entity';
import { Paper } from '../../papers/entities/paper.entity';
import { Patent } from '../../patents/entities/patent.entity';
import { Copyright } from '../../copyrights/entities/copyright.entity';
import { Transform } from '../../transforms/entities/transform.entity';
import { RequestContext } from '../utils/request-context';

/**
 * §6.2 字段级变更日志 —— TypeORM Subscriber。
 *
 * 对核心成果实体(paper / patent / copyright / transform)的 UPDATE / DELETE,
 * 在操作之后捕获变更前(及变更后)的整行,写入一条字段级 audit_log:
 *   operate_type = 'update' | 'delete'
 *   table_name   = 'paper' | 'patent' | 'copyright' | 'transform'
 *   record_id    = 主键
 *   old_value    = 变更前 JSON(update:旧值;delete:被删行)
 *   new_value    = 变更后 JSON(仅 update)
 *   ip_address   = 尽力而为,从 AsyncLocalStorage 取(无则 null)
 *   operate_time = now
 *
 * 与现有 HTTP 级 AuditLogInterceptor 完全共存;新列均为 NULLABLE,互不影响。
 *
 * 注意:TypeORM 以 `new metadata.target()` 无参实例化本类,因此不能用 Nest DI
 *      注入 DataSource。这里改用事件对象自带的 manager(同一事务上下文)写日志。
 */
@EventSubscriber()
export class AuditChangeSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditChangeSubscriber.name);

  // 监听的实体类名 → 表名映射
  private static readonly WATCHED = new Map<string, string>([
    [Paper.name, 'paper'],
    [Patent.name, 'patent'],
    [Copyright.name, 'copyright'],
    [Transform.name, 'transform'],
  ]);

  /**
   * 返回 Object —— TypeORM Broadcaster 对所有实体都会触发本 subscriber,
   * 然后我们在 afterUpdate/afterRemove 里按 event.metadata.name 过滤出核心成果实体。
   */
  listenTo(): Function | string {
    return Object;
  }

  /** UPDATE 之后:entity 为变更后行,databaseEntity 为变更前镜像(typeorm 提供) */
  afterUpdate(event: UpdateEvent<Record<string, unknown>>): void {
    const tableName = AuditChangeSubscriber.tableOf(event);
    if (!tableName) return;
    const recordId = AuditChangeSubscriber.idOf(
      event.databaseEntity ?? event.entity,
    );
    if (recordId == null) return;

    const oldValue = AuditChangeSubscriber.serialize(event.databaseEntity);
    const newValue = AuditChangeSubscriber.serialize(event.entity);

    void this.writeLog(event, {
      operateType: 'update',
      tableName,
      recordId,
      oldValue,
      newValue,
    });
  }

  /** DELETE 之后:databaseEntity 为被删除的行 */
  afterRemove(event: RemoveEvent<Record<string, unknown>>): void {
    const tableName = AuditChangeSubscriber.tableOf(event);
    if (!tableName) return;
    const recordId = AuditChangeSubscriber.idOf(
      event.databaseEntity ?? event.entity,
    );
    if (recordId == null) return;

    const oldValue = AuditChangeSubscriber.serialize(
      event.databaseEntity ?? event.entity,
    );

    void this.writeLog(event, {
      operateType: 'delete',
      tableName,
      recordId,
      oldValue,
      newValue: null,
    });
  }

  // ──── helpers ────

  private static tableOf(
    event:
      | UpdateEvent<Record<string, unknown>>
      | RemoveEvent<Record<string, unknown>>,
  ): string | null {
    const entityName = event.metadata?.name;
    if (!entityName) return null;
    return AuditChangeSubscriber.WATCHED.get(entityName) ?? null;
  }

  private static idOf(entity: unknown): number | null {
    if (!entity || typeof entity !== 'object') return null;
    const id = (entity as { id?: unknown }).id;
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
    return null;
  }

  /** 把实体行序列化成纯 JSON(剔除函数/Buffer,Date 转 ISO;保留 §6.2 完整快照) */
  private static serialize(row: unknown): Record<string, unknown> | null {
    if (!row || typeof row !== 'object') return null;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      if (typeof v === 'function') continue;
      if (v instanceof Date) {
        out[k] = v.toISOString();
      } else if (Buffer.isBuffer(v)) {
        out[k] = `<Buffer ${v.length} bytes>`;
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private async writeLog(
    event:
      | UpdateEvent<Record<string, unknown>>
      | RemoveEvent<Record<string, unknown>>,
    entry: {
      operateType: string;
      tableName: string;
      recordId: number;
      oldValue: Record<string, unknown> | null;
      newValue: Record<string, unknown> | null;
    },
  ): Promise<void> {
    try {
      const repo = event.manager.getRepository(AuditLog);
      const ip = RequestContext.getIp();
      // JSON 列(MySQL)接受任意对象;TypeORM 的 QueryDeepPartialEntity 类型对
      // Record<string, unknown> JSON 列推断过严,这里对 values 做一次受控断言。
      const row = {
        userId: null,
        username: null,
        realName: null,
        method: null,
        path: null,
        module: entry.tableName,
        action: entry.operateType,
        requestBody: null,
        statusCode: null,
        ip: null,
        operateType: entry.operateType,
        tableName: entry.tableName,
        recordId: entry.recordId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ipAddress: ip,
        operateTime: new Date(),
      };
      await repo
        .createQueryBuilder()
        .insert()
        .into(AuditLog)
        // JSON 列与 TypeORM QueryDeepPartialEntity 类型推断不兼容,经 unknown 断言
        .values([row] as unknown as never)
        .execute();
    } catch (err) {
      // 字段级审计写失败绝不影响主业务流程
      this.logger.error(
        `字段级审计写入失败(table=${entry.tableName}, id=${entry.recordId}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
