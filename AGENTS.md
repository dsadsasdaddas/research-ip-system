# 科研成果与知识产权管理系统 — 开发规范（Codex 记忆）

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Element Plus + ECharts + Pinia + Vue Router |
| 后端 | NestJS + TypeORM + MySQL 8 |
| 鉴权 | JWT（8h），Bearer token，7 种角色 |

## 目录约定

```
backend/src/
  auth/             # 认证：guards、decorators、strategy、types/auth-user.interface.ts
  common/           # 公共：types/index.ts、utils/dept-filter.ts、interfaces/
  {module}/         # 业务模块：entities/、dto/、*.service.ts、*.controller.ts、*.module.ts
  uploads/          # 文件上传目录（multer diskStorage）
```

## TypeScript 严格规范（必须遵守）

### 1. 禁止 `any`
- 所有参数、返回值、变量必须有明确类型
- Service 方法签名必须完整：`async findAll(query: FindAllQuery): Promise<FeeWithAlert[]>`
- 禁止 `@Body() body: any`，必须用 DTO 类型

### 2. Entity 字段加 `!`（definite assignment assertion）
```ts
// ✅ 正确
@Column() title!: string;
@Column({ nullable: true }) deptId!: number | null;

// ❌ 错误
@Column() title: string;
```

### 3. Nullable 字段明确联合类型
```ts
// nullable: true → 类型必须含 null
@Column({ nullable: true }) paidDate!: string | null;
@Column({ nullable: true }) amount!: number | null;

// 非 nullable → 纯类型，无 null
@Column() title!: string;
```

### 4. DTO 必须用 class-validator 装饰器
```ts
import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeeDto {
  @IsOptional() @IsString() relationType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() relationId?: number;
  @IsOptional() @IsString() @IsDateString() dueDate?: string;
}
```

### 5. `CurrentUser` 返回 `AuthUser`，禁止 `any`
```ts
// auth/types/auth-user.interface.ts
export interface AuthUser {
  id: number;
  username: string;
  realName: string | null;
  role: UserRole;
  deptId: number | null;
}

// 用法
@Get()
findAll(@CurrentUser() user: AuthUser) { ... }
```

### 6. 部门隔离逻辑放 `common/utils/dept-filter.ts`
```ts
export function isDeptScoped(role: UserRole): boolean { ... }
export function getDeptFilter(user: AuthUser): number | undefined { ... }
```

### 7. 公共类型放 `common/types/index.ts`
- 分页结果：`PageResult<T>`
- 查询参数基类：`BaseListQuery`

## 设计系统（前端）

```css
/* src/styles/index.css 定义的 design tokens，必须用这些，禁用 Element Plus 内部变量 */
--bg-page: #f5f6f7;     /* 页面背景 */
--bg-surface: #ffffff;  /* 卡片/侧栏/顶栏 */
--bg-muted: #fafafa;    /* 表头等浅底 */
--border-color: #e6e8eb;
--text-primary: #1f2329;
--text-regular: #4e5969;
--text-secondary: #86909c;
--el-color-primary: #3b5b8c; /* 低饱和钢蓝，克制专业 */
```

**禁用**：`var(--el-bg-color)`、`var(--el-border-color-lighter)`、`var(--el-text-color-primary)` 等 Element Plus 内部变量。

## 角色列表（UserRole enum）

```ts
RESEARCHER   = 'researcher'       // 科研人员：仅本部门
DEPT_SEC     = 'dept_secretary'   // 部门秘书：本部门
DEPT_ADMIN   = 'dept_admin'       // 部门管理员：本部门
LEADER       = 'leader'           // 院领导：全院
SECRET_ADMIN = 'secret_admin'     // 涉密管理员：全院
AUDITOR      = 'auditor'          // 审计员：只读
SYS_ADMIN    = 'sys_admin'        // 系统管理员：全局
```

**部门隔离规则**：`researcher / dept_secretary / dept_admin` → 只查 `dept_id = user.deptId`；其余角色查全院。

## 数据库

- `autoLoadEntities: true`，`synchronize: true`（仅开发）
- 所有日期字段用 `varchar(20)` 存 `YYYY-MM-DD` 字符串，避免时区问题
- 业务表必须有 `dept_id`、`create_user`、`create_time`

## 后端接口约定

- 全局前缀 `/api`
- 全局 `ValidationPipe({ whitelist: true, transform: true })`
- 全局 `AuditLogInterceptor`（记录写操作）
- 所有接口用 `@UseGuards(JwtAuthGuard)`
- 审计日志接口额外加 `RolesGuard` + `@Roles('auditor','sys_admin','leader')`

## 环境变量（backend/.env）

```
PORT=3001
DB_HOST=localhost  DB_PORT=3306  DB_USER=root  DB_PASSWORD=root1234  DB_NAME=research_db
JWT_SECRET=research-mis-secret-2024
# SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM（不填则邮件禁用）
```

## 默认账号

- 用户名：`admin`，密码：`Admin@123`，角色：`sys_admin`
- 启动时 `UsersService.seedAdmin()` 自动创建

## Imported Claude Cowork project instructions

## Rust 搜索迁移与 CI 约束

- 全文检索计划从当前 TypeScript/MySQL LIKE 实现迁移到 Rust `napi-rs` 原生模块。
- Rust 模块必须先提供最小可测接口：TypeScript/Node 能加载 Rust addon、传入文档、执行搜索并拿到结果。
- CI 必须覆盖 TS ↔ Rust 桥接验证，确保每次提交后 TypeScript 都能成功调用 Rust 搜索模块。
- CI 至少包含：
  1. `backend npm run build`
  2. Rust search addon 构建
  3. Node/TypeScript 调用 Rust addon 的 smoke test
  4. 搜索关键词（如“深度学习”）能返回预期结果
- Rust 搜索接口必须走 TypeScript → Rust，不允许静默 fallback 到 MySQL；Rust addon 缺失或调用失败时直接报错，方便发现问题。

## 简版接口协议（必须遵守）

1. 所有后端接口统一走 `/api/xxx`，登录接口除外也仍在 `/api/auth/login`。
2. 除登录外，所有接口必须使用 JWT：`Authorization: Bearer <token>`。
3. 业务归属字段由后端根据 `AuthUser` 注入，前端不得决定：
   - `deptId = user.deptId`
   - `createUser = user.username`
   - 新增/更新 DTO 中如保留 `deptId/createUser`，Service 层也必须忽略前端传值。
4. 列表接口逐步统一为分页结构：
   ```json
   { "items": [], "total": 0, "page": 1, "pageSize": 20 }
   ```
   旧接口暂可返回数组，但新增接口优先使用分页结构。
5. 错误响应使用 NestJS 默认格式：`statusCode / message / error`。
6. 权限规则统一：
   - `researcher / dept_secretary / dept_admin` 只能访问本部门数据；
   - `leader / secret_admin / auditor / sys_admin` 可访问全院数据；
   - `auditor` 只读，禁止 `POST/PATCH/DELETE`。
7. Rust 搜索接口返回必须包含：`engine: "rust"`、`elapsedMs`、`total`、`items`。


## 确定接口清单

- 详细接口协议固定记录在 `docs/API_PROTOCOL.md`。
- 当前确定接口包括：`auth/login`、成果登记 CRUD（papers/patents/copyrights/transforms）、`papers/doi-lookup`、Rust 搜索 `/api/search`、费用 `/api/fees`、提醒 `/api/reminders`、附件 `/api/attachments`、统计 `/api/stats`、审计日志 `/api/audit-logs`、用户管理 `/api/users`、部门管理 `/api/departments`、数据字典 `/api/dictionaries`、外部接口配置中心 `/api/integrations`（前端路由 `/integrations`）、**审批 `/api/approvals`、检索日志 `/api/search-logs`、报表 `/api/reports`、备份 `/api/backup`、涉密授权 `/api/secret-access`、RBAC `/api/rbac`、通知 `/api/notifications`**（以上均已实现，协议详见 `docs/API_PROTOCOL.md` §8.14–§8.20）。
- 仍未实现、待后续补协议的：移动端接口、报表 PDF 真实导出、`audit_log` 字段级变更日志（当前为 HTTP 请求级，需补 `operate_type/table_name/record_id/old_value/new_value`，对齐说明书 §6.2）。

## 需求落地原则（必须遵守）

- 本项目不按 MVP 简化版随意落地；`研究院科研成果管理系统说明.html` 已明确的需求，应按正式业务系统设计。
- 设计数据库、接口、前端页面时，优先对照 HTML 需求规格说明书，不能只做临时单表/简表方案。
- 可以分阶段编码实现，但数据模型和接口命名必须预留完整业务扩展能力，避免后续大改。
- 数据字典、审批流程、外部接口、涉密授权、报表导出、搜索日志等基础支撑能力，设计时必须按真实业务结构，不使用仅适合 demo 的 MVP 结构。
- 若用户要求“记住”某项项目决策，必须同步写入本文件或对应 docs 文档，确保后续 agent 能继续遵守。


## 数据库建表原则（必须遵守）

- 正式数据库结构以 `database/schema.sql` 为准，默认数据以 `database/seed.sql` 为准。
- TypeORM Entity 只负责代码映射；生产和 CI 必须使用 `TYPEORM_SYNC=false`，禁止依赖 `synchronize: true` 自动建表。
- 新增表/字段时：先改 SQL schema/migration，再改 Entity/DTO/Service/Controller/Frontend。
- 所有 HTML 需求中明确的支撑表（审批、数据字典、报表、搜索日志、涉密、备份、外部接口）必须按正式业务结构设计。
