import { lastValueFrom } from 'rxjs';
import {
  AuditLogInterceptor,
  guessModule,
  guessAction,
  sanitize,
} from './audit-log.interceptor';
import {
  mockRepository,
  mockExecutionContext,
  mockCallHandler,
} from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { AuditLog } from './audit-log.entity';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('guessAction', () => {
  it('POST→create / DELETE→delete / PATCH|PUT→update / 其它→小写', () => {
    expect(guessAction('POST')).toBe('create');
    expect(guessAction('DELETE')).toBe('delete');
    expect(guessAction('PATCH')).toBe('update');
    expect(guessAction('PUT')).toBe('update');
    expect(guessAction('GET')).toBe('get');
  });
});

describe('guessModule', () => {
  it('已知模块名映射', () => {
    expect(guessModule('/api/papers')).toBe('papers');
    expect(guessModule('/api/audit-logs')).toBe('audit-logs');
    expect(guessModule('/api/secret-access')).toBe('secret-access');
  });
  it('未知模块回退到路径段', () => {
    expect(guessModule('/api/auth')).toBe('auth');
  });
  it('空路径回退空串', () => {
    expect(guessModule('')).toBe('');
  });
});

describe('sanitize', () => {
  it('空 body 返回空串', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
  });
  it('敏感字段被替换为 ***', () => {
    const out = sanitize({ username: 'u', password: 'p', apiKey: 'k' });
    expect(out).not.toContain('"p"');
    expect(out).toContain('"***"');
  });

  it('嵌套的 null/undefined/原始值经 redact 处理(保留 null)', () => {
    const out = sanitize({ a: null, b: undefined, c: [null, 1], d: 0 });
    expect(out).toContain('null');
  });
  it('递归处理嵌套对象/数组,跳过 Date/Buffer', () => {
    const out = sanitize({
      nested: { token: 't', keep: 1 },
      list: [{ secret: 's' }],
      d: new Date(0),
      b: Buffer.from('x'),
    });
    expect(out).toContain('"***"');
    // Date/Buffer 不被当普通对象展开(不会崩溃),保留为值
    expect(out.length).toBeGreaterThan(0);
  });
  it('循环引用触发 JSON.stringify 失败 → 返回空串', () => {
    const circ: Record<string, unknown> = { a: 1 };
    circ.self = circ;
    expect(sanitize(circ)).toBe('');
  });
});

describe('AuditLogInterceptor', () => {
  function makeInterceptor(repo = mockRepository()) {
    return {
      ic: new AuditLogInterceptor(repo as unknown as Repository<AuditLog>),
      repo,
    };
  }

  it('GET 等非写操作直接透传,不记日志', async () => {
    const { ic, repo } = makeInterceptor();
    const ctx = mockExecutionContext({
      request: { method: 'GET', url: '/api/papers', headers: {} },
    });
    const out = await lastValueFrom(ic.intercept(ctx, mockCallHandler('x')));
    expect(out).toBe('x');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('POST 记录审计日志并脱敏敏感字段', async () => {
    const { ic, repo } = makeInterceptor();
    const ctx = mockExecutionContext({
      request: {
        method: 'POST',
        url: '/api/papers',
        ip: '1.1.1.1',
        headers: {},
        body: {
          title: 't',
          password: 'secret',
          nested: { apiKey: 'k' },
          list: [{ token: 'x' }],
        },
        user: {
          id: 2,
          username: 'u',
          realName: null,
          role: 'sys_admin',
          deptId: null,
        },
      },
      response: { statusCode: 201 },
    });
    await lastValueFrom(ic.intercept(ctx, mockCallHandler({ ok: true })));
    await flush();
    expect(repo.create).toHaveBeenCalled();
    const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(created.method).toBe('POST');
    expect(created.action).toBe('create');
    expect(created.module).toBe('papers');
    expect(created.ip).toBe('1.1.1.1');
    expect(created.requestBody).toContain('"***"');
    expect(repo.save).toHaveBeenCalled();
  });

  it('DELETE/PATCH/PUT 各自的 action 与 ip 回退', async () => {
    const mk = (method: string) =>
      mockExecutionContext({
        request: {
          method,
          url: '/api/papers/1',
          headers: { 'x-forwarded-for': '2.2.2.2' },
          body: {},
          user: {
            id: 1,
            username: 'u',
            realName: null,
            role: 'sys_admin',
            deptId: null,
          },
        },
        response: { statusCode: 200 },
      });
    for (const [method, action] of [
      ['DELETE', 'delete'],
      ['PATCH', 'update'],
      ['PUT', 'update'],
    ] as const) {
      const repo = mockRepository();
      const ic = new AuditLogInterceptor(
        repo as unknown as Repository<AuditLog>,
      );
      await lastValueFrom(ic.intercept(mk(method), mockCallHandler({})));
      await flush();
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.action).toBe(action);
    }
  });

  it('无 user 时 userId/username 等为 null', async () => {
    const { ic, repo } = makeInterceptor();
    const ctx = mockExecutionContext({
      request: {
        method: 'POST',
        url: '/api/papers',
        headers: {},
        body: { a: 1 },
      },
      response: { statusCode: 201 },
    });
    await lastValueFrom(ic.intercept(ctx, mockCallHandler({})));
    await flush();
    const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(created.userId).toBeNull();
    expect(created.username).toBeNull();
  });

  it('save 失败时静默吞掉,不影响主流程', async () => {
    const repo = mockRepository({
      save: jest.fn().mockRejectedValue(new Error('db')),
    });
    const ic = new AuditLogInterceptor(repo as unknown as Repository<AuditLog>);
    const ctx = mockExecutionContext({
      request: {
        method: 'POST',
        url: '/api/papers',
        headers: {},
        body: {},
        user: { id: 1 },
      },
      response: { statusCode: 201 },
    });
    await expect(
      lastValueFrom(ic.intercept(ctx, mockCallHandler('ok'))),
    ).resolves.toBe('ok');
    await flush();
    expect(repo.save).toHaveBeenCalled();
  });

  it('x-forwarded-for 为数组时取首个 + url 缺失回退 req.path', async () => {
    const { repo } = makeInterceptor();
    const ic = new AuditLogInterceptor(repo as unknown as Repository<AuditLog>);
    const ctx = mockExecutionContext({
      request: {
        method: 'POST',
        path: '/api/papers',
        headers: { 'x-forwarded-for': ['3.3.3.3', '4.4.4.4'] },
        body: {},
        user: {
          id: 1,
          username: 'u',
          realName: null,
          role: 'sys_admin',
          deptId: null,
        },
      },
      response: { statusCode: 201 },
    });
    await lastValueFrom(ic.intercept(ctx, mockCallHandler({})));
    await flush();
    const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(created.path).toBe('/api/papers');
    expect(created.ip).toBe('3.3.3.3');
  });

  it('url 与 path 均缺失时 path 回退空串', async () => {
    const { repo } = makeInterceptor();
    const ic = new AuditLogInterceptor(repo as unknown as Repository<AuditLog>);
    const ctx = mockExecutionContext({
      request: {
        method: 'POST',
        headers: { 'x-forwarded-for': '5.5.5.5' },
        body: {},
        user: { id: 1 },
      },
      response: { statusCode: 201 },
    });
    await lastValueFrom(ic.intercept(ctx, mockCallHandler({})));
    await flush();
    const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(created.path).toBe('');
  });
});
