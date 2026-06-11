import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, tap } from 'rxjs';
import { AuditLog } from './audit-log.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';

interface HttpRequest {
  method: string;
  url?: string;
  path?: string;
  ip?: string;
  headers: Record<string, string | string[]>;
  body?: Record<string, unknown>;
  user?: AuthUser;
}

interface HttpResponse {
  statusCode: number;
}

const MODULE_MAP: Record<string, string> = {
  papers: 'papers', patents: 'patents', copyrights: 'copyrights',
  transforms: 'transforms', fees: 'fees', reminders: 'reminders',
  attachments: 'attachments', users: 'users', departments: 'departments',
};

function guessModule(path: string): string {
  const seg = path.split('/').filter(Boolean);
  return MODULE_MAP[seg[1] ?? seg[0] ?? ''] ?? (seg[1] ?? '');
}

function guessAction(method: string): string {
  if (method === 'POST')   return 'create';
  if (method === 'DELETE') return 'delete';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  return method.toLowerCase();
}

/** 需要脱敏的 key 关键词（不区分大小写） */
const SENSITIVE_KEYS = /password|secret|token|apikey|api_key|private|credential/i;

/** 递归脱敏：遍历所有层级的 key，匹配敏感词的值替换为 *** */
function sanitize(body: unknown): string {
  if (!body) return '';
  try {
    const redacted = redact(body);
    return JSON.stringify(redacted).slice(0, 2000);
  } catch { return ''; }
}

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = SENSITIVE_KEYS.test(k) ? '***' : redact(v);
  }
  return result;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog) private repo: Repository<AuditLog>,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<HttpRequest>();
    const method = req.method;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user   = req.user;
    const path   = req.url ?? req.path ?? '';
    const rawIp  = req.ip ?? req.headers['x-forwarded-for'] ?? '';
    const ip     = Array.isArray(rawIp) ? rawIp[0] : rawIp;

    return next.handle().pipe(
      tap(async () => {
        try {
          const log = this.repo.create({
            userId:      user?.id ?? null,
            username:    user?.username ?? null,
            realName:    user?.realName ?? null,
            method,
            path,
            module:      guessModule(path),
            action:      guessAction(method),
            requestBody: sanitize(req.body),
            statusCode:  ctx.switchToHttp().getResponse<HttpResponse>().statusCode,
            ip,
          });
          await this.repo.save(log);
        } catch (_) {
          // 审计日志写失败不影响主流程
        }
      }),
    );
  }
}
