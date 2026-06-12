# Redis 接入与多维度测试报告 — 2026-06-12

> 本轮应要求「装一下 Redis,全部测试从不同方面再来一遍」。在接入真实 Redis 缓存路径
> 后做端到端验证,过程中**发现并修复了 3 个真实缺陷**(其中 2 个是可用性/正确性级),
> 并修正了若干「看似通过实则空转」的测试。所有结论均有实测命令与数值支撑。

---

## 0. 环境与接入

| 项 | 实测结论 |
| --- | --- |
| Redis 实例 | 本机**已存在原生 Redis**(PID 25964,`127.0.0.1:6379`),另起 Docker 容器时因 `127.0.0.1` 优先于 `0.0.0.0` 绑定,后端实际连到原生实例。最终后端连原生 6379;Docker 全栈改用 compose 内 `redis` 服务(见 §6)。 |
| 接入方式 | `backend/.env` 增加 `REDIS_HOST=127.0.0.1` / `REDIS_PORT=6379` / `REDIS_TTL=60`;`ConfigModule` 自动加载,`CacheService.onModuleInit` 打印 `Redis 缓存已启用: 127.0.0.1:6379 (ttl=60s)`。 |
| 缓存键 | `stats:getAll`(TTL 60s);`search:{dept}:{levels}:{types}:{keyword}`(TTL 60s)。 |

---

## 1. 发现的缺陷(均已修复)

### 缺陷 ① 【严重·正确性】Redis 缓存 TTL 单位错配 —— 缓存形同虚设

- **现象**:`REDIS_TTL=60` 本意 60 秒,但实测 `set(key,val,60)` 写入的键 **60ms 即过期**。
  连续两次 `/api/stats` 始终走冷路径(从未命中),Redis 里查不到任何键。
- **根因**:`cache-manager` + `cache-manager-ioredis-yet` 的 TTL 一律是**毫秒**(store 用 Redis
  `PX` 写 TTL);而 `cache/cache.service.ts` 对外暴露「秒」语义(`wrap(key, 60, …)`),
  却把 `60` 原样塞给 `cache.set(…,60)` → 被当成 60ms。CHANGELOG 早前宣称「生产用 60s Redis
  缓存挡住重复查询」—— 实际命中率≈0。
- **定位**:用独立脚本隔离 `cache-manager` 链路实测:`set(k,v,60)` → 120ms 后键消失;
  `set(k,v,60000)` → TTL=60s 正确。锁定为「秒 vs 毫秒」换算缺失。
- **修复**(`cache.service.ts`):在写入 cache-manager 的边界统一 `* 1000` 换算 ——
  `onModuleInit` 默认 `ttl: ttlSeconds*1000`、`set()` 传 `ttlSeconds*1000`、
  `wrap()` 传 `ttlSeconds*1000`,并加注释说明该坑。
- **实测验证**:`/api/stats` 冷 **17ms → 命中后 2ms**;键 `stats:getAll` **TTL=60s**,
  3s 后 TTL=57s(按秒倒数,不再是 60ms 瞬时消失)。

### 缺陷 ② 【严重·可用性】Redis 宕机时请求永久挂起

- **现象**:`docker stop` 掉 Redis 后,`/api/stats`、`/api/search` 均命中 curl `--max-time 8s`
  超时(`status=000`),后端进程存活但**不响应任何请求**。
- **根因**:`ioredis` 默认 `maxRetriesPerRequest=null`(命令无限重试)。Redis 断连期间,
  `cache.get/set` 的 Promise **既不 resolve 也不 reject**;而 `CacheService.wrap` 的
  `try/catch` 只能捕获「抛出/拒绝」的错误 —— 于是 `await cache.get(...)` 永久卡住,
  整个请求挂起。`cache.service.ts` 注释宣称「永不抛错影响主流程 / 降级回源」,被该默认值击穿。
- **修复**(`cache.service.ts`):`caching(redisStore, { …, maxRetriesPerRequest: 1 })`。
  断连期间命令至多重试 1 次即 `reject`,被 `try/catch` 捕获 → 降级直连,业务不阻塞。
- **实测验证**(停 Redis → 请求 → 起 Redis):
  | 阶段 | /api/stats | /api/search | 后端存活 |
  | --- | --- | --- | --- |
  | 正常(命中) | 200 / 5ms | 200 / 3ms | ✓ |
  | **Redis 宕机** | **200 / 1.10s**(降级,不再 000 挂起) | **200 / 2.30s** | ✓ |
  | Redis 恢复 | 200 / 21ms | — | ✓,缓存键重新写入(DBSIZE=1) |

### 缺陷 ③ 【中等·输入校验】`POST /api/transforms` 空 body 建出垃圾记录

- **现象**:安全扫描发现 `POST /api/transforms` 带 `{}` 返回 **201**(其它三个资源 papers/
  patents/copyrights 都正确返回 400),即在库里插入一条全空的转化记录。
- **根因**:`transforms/dto/create-transform.dto.ts` 所有字段都 `@IsOptional()`。
  (schema 里业务列确实大多可空,但「无对方的转化」无业务意义,且与另三个资源行为不一致。)
- **修复**:将 `partner`(交易对方)改为必填 `@IsString() @IsNotEmpty() @MaxLength(255)`。
  所有现存 e2e/测试创建转化时都带 `partner`,不受影响。
- **实测**:空 `{}` → **400**;e2e 仍 141 全过。

---

## 2. 测试覆盖性缺陷(「空转测试」—— 已修正)

检索接口的查询参数名是 **`q`**(`SearchController @Query('q')`),不是 `keyword`。
历史上多处误用 `keyword=`,使 `q` 为 `undefined` → 走空关键字**早退分支**(`{total:0,items:[]}`),
导致相关断言对空数组恒真,**从未真正测到检索逻辑**:

| 位置 | 原写法 | 问题 | 修正 |
| --- | --- | --- | --- |
| `test/bugfixes.e2e-spec.ts` Fix #12(密级过滤) | `/api/search?keyword=涉密` | `items` 恒为 `[]`,`forEach` 空转 → **密级过滤从未被测** | 改 `q=系统`;修正后 csUser 实得 **10 条**,断言真正生效 |
| `test/resources.e2e-spec.ts` 只读冒烟 | `/api/search?keyword=test` | 只验到 200(早退也返回 200) | 改 `q=test`,真正走检索 |
| CHANGELOG §6.3 Docker 验证记录 | `/api/search?keyword=专利` | 同上,`engine:rust` 来自早退对象 | 见本报告 §6,改用 `q=` 复测 |

---

## 3. 全量测试复核(全部绿)

| # | 命令 | 结果 |
| --- | --- | --- |
| 1 | `cd backend && npm run build` | ✅ `nest build` 无错误 |
| 2 | `cd backend && npm run test:e2e`(**Redis 已启用**) | ✅ **141 passed / 141**,6 套件 |
| 3 | `cd backend && npm run test:rust-search` | ✅ Rust 桥接 OK,**10000 文档 119.29ms ≤ 1000ms** |
| 4 | `cd frontend && npm run build` | ✅ 8.82s(仅 chunk 体积警告) |
| 5 | 安全扫描(21 项,见 §4) | ✅ **21/21 PASS,0 FAIL** |
| 6 | 缓存命中/降级/恢复(见 §1②) | ✅ 全绿 |

> 复测中 `test:rust-search` 一度报 `EBUSY`(Windows 文件锁):一个**残留的挂起 jest 进程**
> (早前 `_probesh` 探针被 `TaskStop` 后子进程未死,持有 `index.node`)所致。杀掉该 PID 后通过。
> 已清理所有临时探针文件。

---

## 4. 安全扫描(对 live 后端,21 项全过)

| 维度 | 用例 | 结果 |
| --- | --- | --- |
| 鉴权 | 无 token 访问 papers/users/stats/backup/rbac | 全 **401** |
| 鉴权 | 伪造/篡改 JWT | **401** |
| 注入 | keyword 注入 `' OR '1'='1`、`%'; DROP TABLE--`、`]--`、`q%' OR 1=1#` | 全 **200 且无 SQL 泄漏**(参数化 + `escapeLike`) |
| 密级隔离 | researcher(csUser)取论文,涉密/机密过滤 | **0 条泄漏** |
| 部门隔离 | csUser vs eeUser 论文集合 | cs=9 / ee=9 / **交集 0** |
| 越权 | researcher → `/api/users`、`/api/backup/logs`、`/api/rbac/roles`(SYS_ADMIN) | 全 **403** |
| 输入校验 | papers/patents/copyrights/**transforms** 空 body | 全 **400**(transforms 修复后) |
| 信息泄漏 | 触发错误响应是否含堆栈/`node:internal`/`TypeError:` | **无泄漏** |
| 检索密级 | researcher 检索结果 | **0 条涉密** |

---

## 5. 受影响文件清单(本轮)

**后端(修改)**:
- `backend/src/cache/cache.service.ts` —— TTL 秒→毫秒换算 + `maxRetriesPerRequest:1`
- `backend/src/transforms/dto/create-transform.dto.ts` —— `partner` 改必填
- `backend/test/bugfixes.e2e-spec.ts` —— Fix #12 检索参数 `keyword→q`
- `backend/test/resources.e2e-spec.ts` —— 检索冒烟参数 `keyword→q`
- `backend/.env` —— 增加 `REDIS_HOST/PORT/TTL`(本机,不进 git)

**基建(修改)**:
- `docker-compose.yml` —— 新增 `redis` 服务 + backend `REDIS_HOST=redis` + depends_on + 头部注释更新

**文档(新增/修改)**:
- `docs/REDIS-TEST-REPORT-2026-06-12.md`(本文件)
- `docs/CHANGELOG-2026-06-12.md` —— 新增 §7(Redis 轮)

---

## 6. Docker 全栈 + Redis(端到端)

`docker-compose.yml` 新增 `redis:7-alpine`(maxmemory 128mb + allkeys-lru,带健康检查,
仅 compose 内网互通),backend `REDIS_HOST=redis` + `depends_on.redis: service_healthy`。
用 `docker-compose.verify.yml` 把宿主端口错开(3307/3002/8081)避开本机原生服务。
构建/验证结果见 CHANGELOG §7(构建产物包含本轮 cache/transforms 修复)。
