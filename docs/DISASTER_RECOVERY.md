# 灾备与数据恢复指南(Disaster Recovery)

> 对应需求说明书 §4「数据备份与灾备」。本文档面向运维人员,说明本系统的备份、恢复、保留
> 策略,以及如何达成/逼近 RTO、RPO 目标。

---

## 1. 设计目标(§4)

| 指标 | 目标 | 当前实现达成情况 |
| --- | --- | --- |
| **RTO**(恢复时间目标) | ≤ 4 小时 | ✅ 单实例 `mysqldump` 恢复 + 应用重启实测在分钟级,远低于 4h |
| **RPO**(恢复点目标) | ≤ 30 分钟 | ⚠️ 见下文:**每日全量备份单独只能保证 RPO ≤ 24h**;达成 ≤ 30min 需叠加 binlog PITR 或缩短备份周期 |

> 诚实说明:当前自动化的是「每日 02:00 全量备份」。它本身最坏情况下会丢失自上次备份
> 以来的全部变更(**RPO ≤ 24h**)。要严格达到 §4 的 RPO ≤ 30min,必须启用 MySQL binlog
> 增量 + 点在时间恢复(PITR),或把 `BACKUP_CRON` 调成每 30 分钟一次。系统另有
> **字段级审计日志**(见第 5 节),可作为灾后数据补录的最后一道底牌,把有效 RPO 压到
> 「分钟级」,但**审计日志回放工具尚未自动化**(见第 6 节已知缺口)。

---

## 2. 备份机制

### 2.1 自动定时备份(推荐生产开启)

- **代码**:`src/backup/backup-schedule.service.ts`(基于 `@nestjs/schedule` cron)
- **开关**:
  - `BACKUP_ENABLED=true` —— 设为 `true` 才注册定时任务;**未设置或非 `true` 时静默跳过**(不报错,便于在 CI/开发环境关闭)。
  - `BACKUP_CRON` —— 5 字段 cron 表达式,**未设置时默认 `0 2 * * *`(每天 02:00)**。
- **动作**:到点调用 `BackupService.runBackup()` → 用 `mysqldump` 导出整库 → 写入文件 + 记录备份日志行;随后执行 `cleanupOldBackups(30)` 清理过期备份。
- **存储位置**:`{process.cwd()}/backups/`(应用工作目录下的 `backups/` 子目录),文件名为时间戳命名。
- **保留策略**:**30 天**(`retentionDays = 30`)。超过 30 天的备份会**同时删除日志记录与磁盘文件**(见 `backup.service.ts` `cleanupOldBackups`)。

```bash
# 生产环境 .env 示例
BACKUP_ENABLED=true
BACKUP_CRON=0 2 * * *      # 每天 02:00(默认值,可省略)
DB_HOST=... DB_PORT=3306 DB_USER=... DB_PASSWORD=... DB_DATABASE=research_db
```

### 2.2 手动触发备份(运维接口)

- **接口**:`POST /api/backup/trigger`
- **权限**:**仅 `sys_admin`**(控制器级 `@Roles(UserRole.SYS_ADMIN)`)
- **用途**:升级前、维护窗口、或按需手动打一份全量快照。
- **返回**:本次备份记录(含备份 id、文件路径、大小、耗时)。

```bash
curl -X POST http://localhost:3001/api/backup/trigger \
  -H "Authorization: Bearer <sys_admin_token>"
```

### 2.3 查看备份日志

- **接口**:`GET /api/backup/logs?page=1&pageSize=20`(分页,结构 `{items,total,page,pageSize,totalPages}`)
- **权限**:仅 `sys_admin`
- **用途**:审计、定位要恢复的备份点。

---

## 3. 恢复流程(RTO ≤ 4h)

### 3.1 一键恢复接口

- **接口**:`POST /api/backup/:id/restore`
- **权限**:仅 `sys_admin`
- **动作**:按备份日志中的 `id` 找到对应 dump 文件,用 `mysql` 客户端把数据导回库(5 分钟超时保护)。

```bash
# 用备份 id=12 恢复
curl -X POST http://localhost:3001/api/backup/12/restore \
  -H "Authorization: Bearer <sys_admin_token>"
```

### 3.2 运维手工恢复(接口不可用时的兜底)

当应用本身也无法启动时,直接用 dump 文件恢复:

```bash
# 1. 定位备份文件(在应用工作目录的 backups/ 下)
ls -lh /opt/research-ip-system/backups/

# 2. 用 mysql 客户端导回(假设文件 backup_20260612_020000.sql.gz)
gunzip -c /opt/research-ip-system/backups/backup_20260612_020000.sql.gz \
  | mysql -h <DB_HOST> -P 3306 -u <DB_USER> -p research_db

# 3. 重启应用
pm2 restart research-ip-backend   # 或 docker compose restart backend
```

**RTO 验证依据**:`mysqldump` 恢复单库(39 张表、万级数据)实测在分钟级完成,加上应用冷启动,总恢复时间远低于 4 小时目标。

---

## 4. 达成 RPO ≤ 30min 的推荐做法

每日全量只能保 RPO ≤ 24h。要逼近/达到 §4 的 30 分钟目标,任选其一:

1. **缩短备份周期(最简单)**:把 `BACKUP_CRON` 设为 `*/30 * * * *`(每 30 分钟)。代价:`mysqldump` 是全量,频率高时磁盘与 I/O 开销上升;30 天保留期下文件数量变多(可同步调小 `retentionDays`)。
2. **MySQL binlog + 点在时间恢复(PITR,推荐生产)**:全量备份之外,保留 binlog;灾后用 `mysqlbinlog` 回放到故障前秒级。这是数据库级标准做法,I/O 开销最低。
3. **审计日志回放(本系统特有能力)**:字段级 `audit_log`(`src/common/subscribers/audit-change.subscriber.ts`)逐条记录了每张业务表的 create/update/delete 及字段旧值/新值。可从「最近一次全量备份」+「之后到故障时刻的审计日志」回放出近实时的数据状态。✅ **回放工具已实现** `scripts/replay-audit.js`(见第 6 节),默认 DRY-RUN 打印重建 SQL,`--apply` 实写。

---

## 5. 字段级审计日志(灾后数据底牌)

- **代码**:`src/common/subscribers/audit-change.subscriber.ts`(TypeORM `EntitySubscriberInterface`)
- **表**:`audit_log`(§6.2 字段:`id, userId, username, action, entity, entityId, before, after, path, method, ip, durationMs, createTime` 等全量列)
- **覆盖**:对受订阅的业务实体,记录字段级变更前/后值、操作人、来源 IP、请求路径。
- **脱敏**:密码等敏感字段在写入前被递归替换为 `***`(见 `Fix #9`)。
- **灾备价值**:即使数据库损坏,只要审计日志表/文件还在,就能据此把业务数据回放到分钟级精度。

---

## 6. 已知缺口(诚实记录)

| 缺口 | 影响 | 建议 |
| --- | --- | --- |
| binlog PITR 未配置 | RPO 严格 ≤ 30min 需人工介入 | 生产部署时由 DBA 开启 binlog + 定期验证回放 |
| 审计日志自动回放工具 | ~~未实现~~ → **已实现 `scripts/replay-audit.js`**(2026-06-12) | 按 `--from/--to` 区间把字段级 audit_log 重放为 INSERT/UPDATE/DELETE;默认 DRY-RUN,`--apply` 实写。已对 live 库 dry-run 验证(见 CHANGELOG §6.1) |
| 备份文件异地副本未自动化 | 单机磁盘故障可能同时丢库与备份 | 把 `backups/` 目录挂载到网络存储 / 对象存储,或加 cron rsync 到异地 |
| `BACKUP_ENABLED` 默认关闭 | 部署时忘记开启则无定时备份 | 生产 `.env` 必须显式设为 `true`,并在部署检查清单中核对 |

---

## 7. 运维检查清单

- [ ] 生产 `.env` 中 `BACKUP_ENABLED=true`
- [ ] `BACKUP_CRON` 符合窗口要求(默认每天 02:00)
- [ ] `GET /api/backup/logs` 能看到每日新增的备份记录
- [ ] `backups/` 目录挂载到可靠存储(非容器临时层)
- [ ] 每季度演练一次 `POST /api/backup/:id/restore`,验证 RTO
- [ ] (追求 RPO ≤ 30min)开启 binlog 或把 `BACKUP_CRON` 调成 `*/30 * * * *`
