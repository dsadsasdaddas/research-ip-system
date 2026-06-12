# 科研成果与知识产权管理系统

研究院科研成果(论文 / 专利 / 软著)与知识产权的全生命周期管理系统。
本仓库按**垂直切片**方式实现:先把论文模块从登记到统计跑通,再逐步扩展。

> 完整需求见 [`研究院科研成果管理系统说明.html`](研究院科研成果管理系统说明.html)(用浏览器打开)。

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Vue 3 + Element Plus + ECharts | 网页界面、表单、统计图表 |
| 后端 | NestJS + TypeORM | 业务逻辑、接口、连数据库 |
| 数据库 | MySQL 8.0(跑在 Docker 里) | 存数据 |
| 鉴权 | JWT | 登录与权限,自己实现 |
| 缓存 *(规划)* | Redis(复用本机 valkey) | 加速热门检索 / 看板 |
| 检索 *(规划·亮点)* | Rust 原生模块(napi-rs) | 自研高性能全文检索,满足十万级 <1s |
| 部署 *(规划)* | Docker Compose | 一键起整套(库 + 后端 + 前端) |

## 环境要求

- [Node.js](https://nodejs.org/)(已验证 v25)+ npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)(用来跑 MySQL)
- Git

## 快速开始

### 1. 启动数据库

```bash
docker compose up -d      # 后台启动 MySQL,首次会自动创建 research_db 库
docker compose ps         # 查看是否在运行
```

> 关闭:`docker compose down`(数据保留)。

**数据库连接信息(本地开发用)**

| 项 | 值 |
|----|----|
| 地址 host | `localhost` |
| 端口 port | `3306` |
| 用户 user | `root` |
| 密码 password | `root1234` |
| 数据库 | `research_db` |

> ⚠️ 此密码仅本地开发用;真实部署时改掉,并写进 `.env`(不进 git)。

### 2. 启动后端

```bash
cd backend
npm install            # 克隆项目后首次需要,把依赖装回来
npm run start:dev      # 开发模式,改代码自动重启
```

后端运行在 **http://localhost:3001**。
> 为什么是 3001 不是 3000?本机 3000 端口已被 One API 服务占用,故后端避开,用 3001。

### 3. 启动前端

```bash
cd frontend
npm install            # 首次需要
npm run dev            # 开发模式
```

前端运行在 **http://localhost:5173**,浏览器打开即可。
> 前端通过 Vite 代理把 `/api` 请求转发到后端 3001,所以代码里不用写死后端地址,也没有跨域问题。

## 接口(成果模块)

后端地址 `http://localhost:3001`,所有接口统一挂在 `/api` 前缀下。三类成果(论文/专利/软著)接口同构:

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/papers` | 新增论文(JSON,标题必填) |
| GET | `/api/papers` | 列表;`?keyword=` 按标题模糊搜 |
| GET | `/api/papers/:id` | 查单条 |
| PATCH | `/api/papers/:id` | 更新(只传要改的字段) |
| DELETE | `/api/papers/:id` | 删除 |

> 专利、软著把上表的 `papers` 换成 `patents` / `copyrights` 即可(关键词分别按专利/软著名称搜)。
> 字段定义见各自实体:`backend/src/{papers,patents,copyrights}/entities/*.entity.ts`(对照说明书 §3.1.1 / §3.1.2 / §3.1.3 / §6.2)。

## 项目结构

```
research-ip-system/
├── docker-compose.yml          # 本地 MySQL 配置(全栈编排待补)
├── database/
│   ├── schema.sql              # 正式建表结构(39 张表,生产/CI 以此为准)
│   ├── seed.sql                # 默认数据(部门/字典/管理员等)
│   └── migrations/             # 迁移脚本
├── backend/                    # NestJS 后端(端口 3001,接口前缀 /api)
│   ├── src/                    # 24 个模块:auth/rbac/users/departments/dictionaries/
│   │                           #   papers/patents/copyrights/transforms/fees/reminders/
│   │                           #   approvals/notifications/email/attachments/stats/
│   │                           #   search(+native/search-engine 🦀 Rust)/search-logs/
│   │                           #   audit-logs/secret-access/reports/backup/integrations/common
│   └── native/search-engine/   # Rust 全文检索原生模块(napi-rs + jieba-rs)
├── frontend/                   # Vue 前端(端口 5173)
│   └── src/
│       ├── layouts/AppLayout.vue   # 布局壳(侧栏+顶栏)
│       ├── components/             # 复用:ResourcePage + SchemaForm + AttachmentPanel
│       ├── modules/                # paper/patent/copyright/transform 字段配置(配置驱动)
│       └── views/                  # 16 个页面(登录/看板/各业务/系统管理)
├── 研究院科研成果管理系统说明.html   # 需求说明书(基准)
└── README.md                   # 本文件
```

## 完成度(对照需求说明书 · 2026-06-12 盘点)

> 数据库 39 张表全部建成(`database/schema.sql`),后端 24 个模块全部 controller+service 落地,前端 16 个页面。
> 下面按需求说明书章节核对,✅=完成、⚠️=部分/有缺口、❌=未做。

### 按需求章节核对

| 需求章节 | 状态 | 落地情况 |
|---|---|---|
| §2 用户角色(RBAC + 部门隔离) | ✅ | 7 角色 + `rbac` 模块(角色/权限/分配)+ `common/utils/dept-filter.ts` 部门隔离 |
| §3.1.1 论文登记 | ✅ | papers 模块 + DOI 自动补全(`/api/papers/doi-lookup`),字段全覆盖 §6.2 |
| §3.1.2 专利登记 | ✅ | patents 模块,含发明人/专利权人/PCT 阶段/法律状态 |
| §3.1.3 软著登记 | ✅ | copyrights 模块 |
| §3.1.4 通用功能(审批流程/全程日志/注销归档) | ✅ | `approvals` 模块(流程/节点/实例/记录)、`audit-logs`、各表 `approval_status`/`archive_status`/`cancel_reason` |
| §3.2 成果转化管理 | ✅ | `transforms` + `transform-distribution`,含节点/异常/跟进 |
| §3.3 知识产权费用管理 | ✅ | `fees` + 缴费计划/缴费记录/凭证/预警汇总/自动生成计划 |
| §3.4 成果统计分析 | ⚠️ | `stats` 看板 + `reports`(模板/导出/定时任务)✅;导出仅 xlsx/csv,**pdf 为占位**(暂用 xlsx 替代) |
| §3.5 申报提醒 | ✅ | `reminders`(规则/任务/二次催办)+ `notifications`(站内信)+ `email`(邮件),短信通道预留 |
| §3.6 全文检索 | ✅ | 🦀 Rust napi-rs(jieba-rs 中文分词)+ `search-logs`(含热门词)+ 涉密权限闸 `secret-access` |
| §4 非功能 · 性能/并发 | ⚠️ | Rust 检索满足 <1s 设计目标;50 并发压测、十万级 benchmark **未跑** |
| §4 非功能 · 数据备份 | ✅ | `backup` 模块(触发/恢复/日志) |
| §4 非功能 · 灾备/移动端 | ❌ | 移动端适配未做;灾备指标未验证 |
| §5 外部 API 接口中心 | ✅ | `integrations` 配置中心(8 类:crossref/scopus/openalex/cnipa/hr_ldap/finance/email/sms)+ 测试/日志/告警/字段映射 |
| §6 数据模型 | ⚠️ | 9 张核心实体字段全覆盖 §6.2;**`audit_log` 设计偏离**:HTML 要求字段级变更日志(`operate_type/table_name/record_id/old_value/new_value`),实际为 HTTP 请求日志(`method/path/body/status_code`) |

### 原始 4 周路线图(留档)

**第 0 步 · 地基**
- [x] 环境:Node / Git / Docker + MySQL
- [x] 后端 NestJS 骨架(端口 3001)+ TypeORM 连上 MySQL
- [x] 前端 Vue 骨架,三层打通(Vite+Vue3+Element Plus,经 /api 代理增删改查跑通)

**第 1 周 · 核心系统**
- [x] 论文登记 增/删/改/查(全字段按 §3.1.1 / §6.2)
- [x] 登录 + JWT 基础权限(`auth`)
- [x] 🦀 Rust 全文检索 + ECharts 统计看板(`search` + `stats`)
- [x] DOI 自动补全(对接 Crossref,§5 接口①)

**第 2 周 · 企业级骨架**
- [x] RBAC 角色权限 + 部门数据隔离(§2)
- [x] 操作审计日志(§4,全局 `AuditLogInterceptor`)
- [ ] Redis 缓存(复用本机 valkey)— **未做**(无 cache-manager/ioredis 依赖)

**第 3 周 · 🦀 硬核亮点**
- [x] Rust 高性能检索原生模块(napi-rs,内存倒排索引 + jieba-rs 中文分词)
- [x] 接入后端(`search.service` → `rustSearch.search`,无 MySQL 静默 fallback,返回 `engine:"rust"` + `elapsedMs`)
- [x] 万级 benchmark:`npm run test:rust-search` 实测 **10000 条 115.7ms < 1s**(满足 §4 全文检索 <1s)
- [ ] 十万级 benchmark + JS vs Rust 对比报告 — **未跑**

**第 4 周 · 交付**
- [ ] Docker 一键部署整套 — **部分**(`docker-compose.yml` 目前只起 MySQL,后端/前端未编排)
- [x] 数据大屏 + 文档完善
- [x] 专利 / 软著建表 + 登记(配置驱动复用组件,字段按 §3.1.2 / §3.1.3 / §6.2)
- [x] 年费提醒 / 缴费计划(已超额完成)

### 已落地但原路线图未列的模块(超额)

`approvals`(审批)、`reports`(报表)、`backup`(备份)、`secret-access`(涉密授权)、`search-logs`(检索日志)、`notifications`(通知)、`integrations`(外部接口中心)、`dictionaries`(数据字典两表)、`departments`(部门)、`users`(用户)。前端对应页面均已接入。

### 待补缺口(按优先级)

1. **audit_log 对齐 §6.2** — 补 `operate_type/table_name/record_id/old_value/new_value` 字段级变更记录(当前仅 HTTP 日志)。
2. **报表 PDF 导出** — 当前 pdf 走 xlsx 占位,需接真实 PDF 生成。
3. **Docker 全栈编排** — 把后端/前端一起编入 compose,一键起整套。
4. **Redis 缓存** — 热门检索/看板加速。
5. **性能压测** — 50 并发 + 十万级检索 <1s 实测,出 benchmark 报告。

## 开发日志

| 日期 | 进展 |
|------|------|
| 2026-06-04 | 初始化 git 仓库;用 Docker 搭好 MySQL(research_db);补充 README / CLAUDE 文档 |
| 2026-06-05 | 用 NestJS 脚手架生成后端骨架,端口改为 3001(避开 One API),冒烟测试返回 Hello World |
| 2026-06-05 | 后端接入 TypeORM + @nestjs/config,成功连上 MySQL;确定一个月 4 周计划(含 Rust 自研检索亮点) |
| 2026-06-05 | 第 1 周:按 §3.1.1/§6.2 定义论文实体,paper 表自动建成(utf8mb4,中文读写正常) |
| 2026-06-05 | 论文模块后端完成:5 个 REST 接口(增删改查 + 关键词搜索)+ 全局入参校验,curl 全测通过 |
| 2026-06-06 | 搭好 Vue3 前端(Vite+Element Plus):论文列表(表格+关键词搜)+ 弹窗表单(全字段,分区块);后端加 /api 全局前缀,前端用 Vite 代理转发;三层增删改查端到端跑通 |
| 2026-06-06 | 前端定调:左侧栏+顶栏布局 + 中性灰克制风格(设计令牌);抽出复用组件 ResourcePage / SchemaForm(配置驱动)。新增专利、软著后端模块 + 字段配置,三类成果登记全部跑通(端到端验证) |
| 2026-06-10 | 全功能补全(Phase 0-9):数据库扩到 39 张表 100% 覆盖;新增审批/费用/提醒/统计/审计/涉密/检索日志/报表/备份/外部接口中心/数据字典等模块;🦀 Rust 检索原生模块(napi-rs + jieba-rs)落地并接入后端;前端补齐通知/审批/报表/RBAC/备份等页面 |
| 2026-06-11 | 修复新模块接口 bug + 补充 E2E 测试(7 模块 36 用例);安全加固:补齐输入校验、堵住权限校验绕过(Gemini 评审) |
| 2026-06-12 | 盘点完成度并同步文档:README 路线图与项目结构按需求说明书章节重新核对;API_PROTOCOL.md 补齐已实现模块(审批/报表/备份/涉密/检索日志)的正式协议;标记已知缺口(audit_log 字段级日志、PDF 导出、全栈 Docker、Redis、压测) |
