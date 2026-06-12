import { Observable, lastValueFrom } from 'rxjs';
import { RequestContext, RequestContextInterceptor } from '../request-context';
import {
  mockExecutionContext,
  mockCallHandler,
  mockCallHandlerError,
} from '../../../testing/mocks';

describe('RequestContext (ALS)', () => {
  it('getIp 在 run 作用域内返回写入的 ip', () => {
    let captured: string | null = 'init';
    RequestContext.run({ ip: '1.2.3.4' }, () => {
      captured = RequestContext.getIp();
    });
    expect(captured).toBe('1.2.3.4');
  });

  it('getIp 在无作用域时返回 null', () => {
    expect(RequestContext.getIp()).toBeNull();
  });
});

describe('RequestContextInterceptor', () => {
  it('从 req.ip 读取 IP 并透传 next 的值', async () => {
    const ctx = mockExecutionContext({
      request: { ip: '9.9.9.9', headers: {} },
    });
    let capturedIp: string | null = 'untouched';
    const next = {
      handle: jest.fn(
        () =>
          new Observable<string>((sub) => {
            // 此刻应当处于 ALS.run 内
            capturedIp = RequestContext.getIp();
            sub.next('payload');
            sub.complete();
          }),
      ),
    };
    const out = await lastValueFrom(
      new RequestContextInterceptor().intercept(ctx, next as never),
    );
    expect(out).toBe('payload');
    expect(capturedIp).toBe('9.9.9.9');
  });

  it('req.ip 缺失时回退到 x-forwarded-for(字符串)', async () => {
    const ctx = mockExecutionContext({
      request: { headers: { 'x-forwarded-for': '8.8.8.8' } },
    });
    let capturedIp: string | null = null;
    const next = {
      handle: jest.fn(
        () =>
          new Observable<void>((sub) => {
            capturedIp = RequestContext.getIp();
            sub.next(undefined);
            sub.complete();
          }),
      ),
    };
    await lastValueFrom(
      new RequestContextInterceptor().intercept(ctx, next as never),
    );
    expect(capturedIp).toBe('8.8.8.8');
  });

  it('x-forwarded-for 为数组时取首个', async () => {
    const ctx = mockExecutionContext({
      request: { headers: { 'x-forwarded-for': ['7.7.7.7', '2.2.2.2'] } },
    });
    let capturedIp: string | null = null;
    const next = {
      handle: jest.fn(
        () =>
          new Observable<void>((sub) => {
            capturedIp = RequestContext.getIp();
            sub.next(undefined);
            sub.complete();
          }),
      ),
    };
    await lastValueFrom(
      new RequestContextInterceptor().intercept(ctx, next as never),
    );
    expect(capturedIp).toBe('7.7.7.7');
  });

  it('x-forwarded-for 为空数组时 ip 为 null', async () => {
    const ctx = mockExecutionContext({
      request: { headers: { 'x-forwarded-for': [] } },
    });
    let capturedIp: string | null = 'x';
    const next = {
      handle: jest.fn(
        () =>
          new Observable<void>((sub) => {
            capturedIp = RequestContext.getIp();
            sub.next(undefined);
            sub.complete();
          }),
      ),
    };
    await lastValueFrom(
      new RequestContextInterceptor().intercept(ctx, next as never),
    );
    expect(capturedIp).toBeNull();
  });

  it('无任何 IP 来源时 ip 为 null', async () => {
    const ctx = mockExecutionContext({ request: { headers: {} } });
    let capturedIp: string | null = 'x';
    const next = {
      handle: jest.fn(
        () =>
          new Observable<void>((sub) => {
            capturedIp = RequestContext.getIp();
            sub.next(undefined);
            sub.complete();
          }),
      ),
    };
    await lastValueFrom(
      new RequestContextInterceptor().intercept(ctx, next as never),
    );
    expect(capturedIp).toBeNull();
  });

  it('透传下游错误', async () => {
    const ctx = mockExecutionContext({
      request: { ip: '1.1.1.1', headers: {} },
    });
    const next = mockCallHandlerError(new Error('boom'));
    await expect(
      lastValueFrom(new RequestContextInterceptor().intercept(ctx, next)),
    ).rejects.toThrow('boom');
  });
});
