import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * 跨层请求上下文(基于 Node AsyncLocalStorage)。
 * 主要用途:让 TypeORM Subscriber(字段级审计)能拿到当前 HTTP 请求的 IP ——
 *   subscriber 无法直接访问 NestJS ExecutionContext,故由拦截器在请求开始时写入 ALS。
 *
 * 任何地方都可通过 RequestContext.getIp() 读取当前请求的 IP(无请求上下文时返回 null)。
 */
interface RequestStore {
  ip: string | null;
}

const als = new AsyncLocalStorage<RequestStore>();

export class RequestContext {
  static run<T>(store: RequestStore, fn: () => T): T {
    return als.run(store, fn);
  }

  static getIp(): string | null {
    return als.getStore()?.ip ?? null;
  }
}

/**
 * 一个极简拦截器:把请求 IP 写入 AsyncLocalStorage,供下游(subscriber 等)读取。
 * 注册顺序需在「业务处理之前」,通常与 AuditLogInterceptor 一起全局注册。
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<{
      ip?: string;
      headers: Record<string, string | string[]>;
    }>();
    const rawIp = req.ip ?? req.headers['x-forwarded-for'] ?? '';
    const ip = Array.isArray(rawIp) ? (rawIp[0] ?? null) : rawIp || null;

    return new Observable<unknown>((subscriber) => {
      RequestContext.run({ ip }, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
