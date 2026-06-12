import type { Cache as CmCache } from 'cache-manager';

// 模拟底层 cache-manager + cache-manager-ioredis-yet:
//  - caching(factory, config) 返回我们注入的 cache mock;
//  - redisStore 作为工厂透传给 caching,只用于断言传参。
const redisStoreMock = { __redisStore: true };
let cachingMock: jest.Mock;
let lastStoreConfig: Record<string, unknown> | undefined;

jest.mock('cache-manager', () => {
  const actual = jest.requireActual('cache-manager');
  return {
    ...actual,
    // caching 是 jest.fn,在每个用例里 mockResolvedValue 注入 cache 对象
    caching: (...args: unknown[]) => cachingMock(...args),
  };
});

jest.mock('cache-manager-ioredis-yet', () => ({
  redisStore: redisStoreMock,
}));

// 动态 require('cache-manager-ioredis-yet') 会走到上面这个 mock(模块名相同)

import { CacheService } from './cache.service';

/** 造一个可控的 cache mock:方法都是 jest.Mock,可断言/控制返回。 */
function mockCmCache(overrides: Record<string, jest.Mock> = {}): CmCache {
  const cache: Record<string, jest.Mock> = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    wrap: jest.fn(),
    store: {},
    ...overrides,
  };
  return cache as unknown as CmCache;
}

describe('CacheService', () => {
  const originalEnv = { ...process.env };
  const originalLoggerWarn = console.warn;

  beforeEach(() => {
    jest.resetModules();
    // 清理环境变量,默认无 REDIS_HOST → 降级模式
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_TTL;
    // 静默 Logger 输出
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    console.warn = jest.fn(() => undefined);

    lastStoreConfig = undefined;
    cachingMock = jest
      .fn()
      .mockImplementation(
        (_store: unknown, config: Record<string, unknown>) => {
          lastStoreConfig = config;
          return Promise.resolve(mockCmCache());
        },
      );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    console.warn = originalLoggerWarn;
  });

  // ──── onModuleInit:降级分支 ────

  describe('onModuleInit (降级)', () => {
    it('REDIS_HOST 未设置 → enabled=false,不连接 Redis', async () => {
      const svc = new CacheService();
      await svc.onModuleInit();
      expect(svc.isEnabled()).toBe(false);
      expect(cachingMock).not.toHaveBeenCalled();
    });

    it('get/set/del/wrap 在禁用时均为透传/空操作', async () => {
      const svc = new CacheService();
      await svc.onModuleInit();
      await expect(svc.get('k')).resolves.toBeUndefined();
      await expect(svc.set('k', 'v')).resolves.toBeUndefined();
      await expect(svc.del('k')).resolves.toBeUndefined();
      // wrap 未启用 → 直接跑 loader,不查缓存
      const loader = jest.fn().mockResolvedValue('fresh');
      await expect(svc.wrap('k', 60, loader)).resolves.toBe('fresh');
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });

  // ──── onModuleInit:启用分支 ────

  describe('onModuleInit (启用)', () => {
    it('REDIS_HOST 设置 → 用默认 port/ttl 启用缓存(秒→毫秒换算)', async () => {
      process.env.REDIS_HOST = 'redis.local';
      const svc = new CacheService();
      await svc.onModuleInit();
      expect(svc.isEnabled()).toBe(true);
      expect(cachingMock).toHaveBeenCalledTimes(1);
      // 第一个参数是 redisStore 工厂(动态 require 拿到的对象)
      expect(cachingMock.mock.calls[0][0]).toBe(redisStoreMock);
      // config: host 透传, port/ttl 默认值且 ttl 已 ×1000
      expect(lastStoreConfig).toMatchObject({
        host: 'redis.local',
        port: 6379,
        ttl: 60 * 1000,
        maxRetriesPerRequest: 1,
      });
    });

    it('REDIS_PORT / REDIS_TTL 自定义 → 透传并换算', async () => {
      process.env.REDIS_HOST = 'redis.local';
      process.env.REDIS_PORT = '16379';
      process.env.REDIS_TTL = '120';
      const svc = new CacheService();
      await svc.onModuleInit();
      expect(lastStoreConfig).toMatchObject({
        host: 'redis.local',
        port: 16379,
        ttl: 120 * 1000,
      });
    });

    it('caching 抛错 → 降级为不启用(不中断启动)', async () => {
      process.env.REDIS_HOST = 'redis.local';
      cachingMock = jest
        .fn()
        .mockRejectedValue(new Error('connection refused'));
      const svc = new CacheService();
      await expect(svc.onModuleInit()).resolves.toBeUndefined();
      expect(svc.isEnabled()).toBe(false);
    });

    it('caching 抛非 Error 值 → 走 String(err) 分支并降级', async () => {
      process.env.REDIS_HOST = 'redis.local';
      cachingMock = jest.fn().mockRejectedValue('string-error');
      const svc = new CacheService();
      await expect(svc.onModuleInit()).resolves.toBeUndefined();
      expect(svc.isEnabled()).toBe(false);
    });
  });

  // ──── 启用态:get / set / del / wrap 行为 ────

  describe('启用态 CRUD', () => {
    let svc: CacheService;
    let cache: Record<string, jest.Mock>;

    beforeEach(async () => {
      process.env.REDIS_HOST = 'redis.local';
      cache = mockCmCache();
      cachingMock = jest.fn().mockResolvedValue(cache);
      svc = new CacheService();
      await svc.onModuleInit();
    });

    it('get 命中 → 返回值', async () => {
      cache.get.mockResolvedValue('cached-value');
      await expect(svc.get('k')).resolves.toBe('cached-value');
      expect(cache.get).toHaveBeenCalledWith('k');
    });

    it('get 返回 null → 转成 undefined', async () => {
      cache.get.mockResolvedValue(null);
      await expect(svc.get('k')).resolves.toBeUndefined();
    });

    it('get 抛错 → 捕获并返回 undefined(优雅降级)', async () => {
      cache.get.mockRejectedValue(new Error('redis down'));
      await expect(svc.get('k')).resolves.toBeUndefined();
    });

    it('get 抛非 Error 值 → 走 String(err) 分支', async () => {
      cache.get.mockRejectedValue('boom-string');
      await expect(svc.get('k')).resolves.toBeUndefined();
    });

    it('set 无 ttl → 直接写', async () => {
      await svc.set('k', 'v');
      expect(cache.set).toHaveBeenCalledWith('k', 'v');
    });

    it('set 带 ttl(秒)→ 换算成毫秒', async () => {
      await svc.set('k', 'v', 30);
      expect(cache.set).toHaveBeenCalledWith('k', 'v', 30 * 1000);
    });

    it('set 抛错 → 捕获(不影响主流程)', async () => {
      cache.set.mockRejectedValue(new Error('redis down'));
      await expect(svc.set('k', 'v', 10)).resolves.toBeUndefined();
    });

    it('set 抛非 Error 值 → 走 String(err) 分支', async () => {
      cache.set.mockRejectedValue(42);
      await expect(svc.set('k', 'v')).resolves.toBeUndefined();
    });

    it('del 正常 → 委托', async () => {
      await svc.del('k');
      expect(cache.del).toHaveBeenCalledWith('k');
    });

    it('del 抛错 → 捕获', async () => {
      cache.del.mockRejectedValue(new Error('redis down'));
      await expect(svc.del('k')).resolves.toBeUndefined();
    });

    it('del 抛非 Error 值 → 走 String(err) 分支', async () => {
      cache.del.mockRejectedValue({ custom: 'err' });
      await expect(svc.del('k')).resolves.toBeUndefined();
    });

    describe('wrap', () => {
      it('缓存命中 → 返回缓存,不跑 loader', async () => {
        cache.get.mockResolvedValue('cached');
        const loader = jest.fn().mockResolvedValue('fresh');
        await expect(svc.wrap('k', 60, loader)).resolves.toBe('cached');
        expect(loader).not.toHaveBeenCalled();
        // 命中时不写缓存
        expect(cache.set).not.toHaveBeenCalled();
      });

      it('缓存未命中 → 跑 loader 并写入(TTL 换算)', async () => {
        cache.get.mockResolvedValue(undefined);
        const loader = jest.fn().mockResolvedValue('fresh');
        const res = await svc.wrap('k', 45, loader);
        expect(res).toBe('fresh');
        expect(loader).toHaveBeenCalledTimes(1);
        expect(cache.set).toHaveBeenCalledWith('k', 'fresh', 45 * 1000);
      });

      it('缓存命中为 null → 视为未命中,跑 loader', async () => {
        cache.get.mockResolvedValue(null);
        const loader = jest.fn().mockResolvedValue('fresh');
        const res = await svc.wrap('k', 60, loader);
        expect(res).toBe('fresh');
        expect(loader).toHaveBeenCalled();
      });

      it('get 抛错 → 捕获后回源(loader 仍执行,结果正常返回)', async () => {
        cache.get.mockRejectedValue(new Error('redis down'));
        const loader = jest.fn().mockResolvedValue('fresh');
        const res = await svc.wrap('k', 60, loader);
        expect(res).toBe('fresh');
        expect(loader).toHaveBeenCalled();
        // get 失败后仍尝试 set
        expect(cache.set).toHaveBeenCalled();
      });

      it('get 抛非 Error 值 → 走 String(err) 分支后回源', async () => {
        cache.get.mockRejectedValue('get-string-err');
        const loader = jest.fn().mockResolvedValue('fresh');
        await expect(svc.wrap('k', 60, loader)).resolves.toBe('fresh');
      });

      it('set 抛错 → 捕获,loader 结果仍返回', async () => {
        cache.get.mockResolvedValue(undefined);
        cache.set.mockRejectedValue(new Error('redis down'));
        const loader = jest.fn().mockResolvedValue('fresh');
        await expect(svc.wrap('k', 60, loader)).resolves.toBe('fresh');
      });

      it('set 抛非 Error 值 → 走 String(err) 分支,loader 结果仍返回', async () => {
        cache.get.mockResolvedValue(undefined);
        cache.set.mockRejectedValue(['set', 'err']);
        const loader = jest.fn().mockResolvedValue('fresh');
        await expect(svc.wrap('k', 60, loader)).resolves.toBe('fresh');
      });

      it('loader 抛错 → 异常向上抛(不吞)', async () => {
        cache.get.mockResolvedValue(undefined);
        const loader = jest.fn().mockRejectedValue(new Error('boom'));
        await expect(svc.wrap('k', 60, loader)).rejects.toThrow('boom');
      });
    });
  });

  // ──── onModuleDestroy ────

  describe('onModuleDestroy', () => {
    it('禁用态 → 安全无操作', async () => {
      const svc = new CacheService();
      await svc.onModuleInit();
      await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('启用态 + 有 quit 客户端 → 调用 quit', async () => {
      process.env.REDIS_HOST = 'redis.local';
      const quit = jest.fn();
      const cache = mockCmCache({
        store: { client: { quit } } as unknown as Record<string, jest.Mock>,
      });
      cachingMock = jest.fn().mockResolvedValue(cache);
      const svc = new CacheService();
      await svc.onModuleInit();
      await svc.onModuleDestroy();
      expect(quit).toHaveBeenCalled();
    });

    it('启用态 + client 无 quit 方法 → 不抛错', async () => {
      process.env.REDIS_HOST = 'redis.local';
      const cache = mockCmCache({
        store: { client: {} } as unknown as Record<string, jest.Mock>,
      });
      cachingMock = jest.fn().mockResolvedValue(cache);
      const svc = new CacheService();
      await svc.onModuleInit();
      await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('启用态 + 无 client → 安全无操作', async () => {
      process.env.REDIS_HOST = 'redis.local';
      const cache = mockCmCache({
        store: {} as unknown as Record<string, jest.Mock>,
      });
      cachingMock = jest.fn().mockResolvedValue(cache);
      const svc = new CacheService();
      await svc.onModuleInit();
      await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('quit 抛错 → 捕获,不向上抛', async () => {
      process.env.REDIS_HOST = 'redis.local';
      const cache = mockCmCache({
        store: {
          client: {
            quit: () => {
              throw new Error('quit failed');
            },
          },
        } as unknown as Record<string, jest.Mock>,
      });
      cachingMock = jest.fn().mockResolvedValue(cache);
      const svc = new CacheService();
      await svc.onModuleInit();
      await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
