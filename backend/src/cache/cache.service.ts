import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { caching, type Cache as CmCache } from 'cache-manager';

/**
 * 配置门控的 Redis 缓存服务。
 *
 * - 当 process.env.REDIS_HOST 设置时:用 cache-manager + ioredis 连接 Redis,
 *   GET /api/stats、检索等热路径用 wrap() 缓存(TTL 默认 60s)。
 * - 当 REDIS_HOST 未设置时:不连接 Redis,wrap() 直接执行 loader(透传),
 *   get/set/del 为空操作。应用照常启动,无任何硬依赖。
 *
 * 设计为「永不抛错影响主流程」:缓存层任何异常都被吞掉并记录,返回 null / 直接回源。
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private cache: CmCache | null = null;
  private enabled = false;

  async onModuleInit(): Promise<void> {
    const host = process.env.REDIS_HOST;
    if (!host) {
      this.logger.log('REDIS_HOST 未设置,跳过 Redis 缓存注册(应用照常运行)。');
      this.enabled = false;
      return;
    }

    try {
      // 动态 require,避免在无 Redis 环境下加载失败

      const { redisStore } = require('cache-manager-ioredis-yet');
      const port = Number(process.env.REDIS_PORT ?? 6379);
      const ttlSeconds = Number(process.env.REDIS_TTL ?? 60);

      // cache-manager v5: caching(storeFactory, config) 返回 Cache 实例。
      // redisStore 是一个工厂,接受 ioredis 连接配置。
      //
      // 【TTL 单位坑】cache-manager 的 TTL 一律是「毫秒」,而 cache-manager-ioredis-yet 的
      // store.set() 用 Redis 的 'PX'(毫秒)写 TTL。本服务对外暴露的是「秒」语义(调用方传 60
      // 表示 60 秒),因此在写入 cache-manager 前必须 ×1000 换算成毫秒。否则 60s 会被当成 60ms,
      // 键几乎瞬时过期,缓存形同虚设(命中率≈0)。默认 TTL 也按秒配置后换算。
      const cache = await caching(redisStore, {
        // ioredis 连接选项透传
        host,
        port,
        ttl: ttlSeconds * 1000,
        // 【可用性关键】ioredis 默认 maxRetriesPerRequest=null(命令无限重试)。一旦 Redis 宕机,
        // get/set 的 Promise 会永久 pending(既不 resolve 也不 reject),而 CacheService 的
        // try/catch 只能捕获「抛出/拒绝」的错误 —— 于是 wrap() 卡在 await cache.get(...) 上,
        // 整个请求挂起(实测:Redis 停机后 /api/stats、/api/search 均超时不返回)。
        // 设为 1:命令在断连期间至多重试 1 次后立即 reject → 被 try/catch 捕获 → 降级回源,
        // 业务请求在 Redis 宕机时仍能正常(虽变慢)返回,不阻塞。
        maxRetriesPerRequest: 1,
      } as Record<string, unknown>);
      this.cache = cache;
      this.enabled = true;
      this.logger.log(`Redis 缓存已启用: ${host}:${port} (ttl=${ttlSeconds}s)`);
    } catch (err) {
      // 任何初始化异常都降级为「不启用」,保证启动不中断
      this.logger.error(
        `Redis 缓存初始化失败,降级为不缓存: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.enabled = false;
      this.cache = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    const store = this.cache?.store as
      | { client?: { disconnect?: () => void; quit?: () => void } }
      | undefined;
    try {
      // cache-manager v5 没有标准 close,关底层 ioredis 客户端
      const client = store?.client;
      if (client && typeof client.quit === 'function') {
        client.quit();
      }
    } catch {
      // ignore
    }
  }

  /** 是否实际启用了 Redis 缓存 */
  isEnabled(): boolean {
    return this.enabled;
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.enabled || !this.cache) return undefined;
    try {
      const v = await this.cache.get<T>(key);
      return v ?? undefined;
    } catch (err) {
      this.logger.warn(
        `cache.get 失败(${key}): ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.enabled || !this.cache) return;
    try {
      // cache-manager TTL 单位是毫秒,本服务对外是「秒」,这里换算(见 onModuleInit 注释)。
      if (ttlSeconds != null) {
        await this.cache.set(key, value, ttlSeconds * 1000);
      } else {
        await this.cache.set(key, value);
      }
    } catch (err) {
      this.logger.warn(
        `cache.set 失败(${key}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.cache) return;
    try {
      await this.cache.del(key);
    } catch (err) {
      this.logger.warn(
        `cache.del 失败(${key}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * 缓存回源:命中则直接返回,未命中则跑 loader 并写入缓存。
   * 未启用缓存时直接跑 loader(透传)。
   * loader 抛错时不写缓存,异常向上抛出(不影响业务语义)。
   */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled || !this.cache) {
      return loader();
    }
    try {
      const cached = await this.cache.get<T>(key);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch (err) {
      this.logger.warn(
        `cache.wrap get 失败(${key}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const fresh = await loader();
    try {
      // cache-manager TTL 单位是毫秒,本服务 wrap 对外是「秒」,这里换算(见 onModuleInit 注释)。
      await this.cache.set(key, fresh, ttlSeconds * 1000);
    } catch (err) {
      this.logger.warn(
        `cache.wrap set 失败(${key}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return fresh;
  }
}
