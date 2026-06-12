import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * 全局缓存模块。CacheService 内部按 REDIS_HOST 门控:
 *   - 未设置 → 不连接 Redis,所有操作透传(应用照常启动)。
 *   - 已设置 → 用 cache-manager + ioredis 连接 Redis。
 *
 * 因为全应用(stats / search 等多模块)都要用,故标为 @Global。
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
