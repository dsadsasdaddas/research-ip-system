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
homeworl/
├── docker-compose.yml      # 本地 MySQL 配置
├── backend/                # NestJS 后端(端口 3001,接口前缀 /api)
│   └── src/{papers,patents,copyrights}/   # 三类成果模块(实体/DTO/服务/控制器)
├── frontend/               # Vue 前端(端口 5173)
│   └── src/
│       ├── layouts/AppLayout.vue       # 布局壳(侧栏+顶栏)
│       ├── components/                 # 复用组件:ResourcePage(通用列表页)+ SchemaForm(配置驱动表单)
│       └── modules/{paper,patent,copyright}.js   # 各成果的字段配置(页面=配置+复用组件)
├── 研究院科研成果管理系统说明.html   # 需求说明书
└── README.md               # 本文件
```

## 开发路线图(一个月 · 4 周)

> 思路:先把系统跑起来能用,再逐层加企业级与硬核能力。所有功能字段对照需求说明书实现。

**第 0 步 · 地基**
- [x] 环境:Node / Git / Docker + MySQL
- [x] 后端 NestJS 骨架(端口 3001)
- [x] 后端接入 TypeORM 并连上 MySQL(连接验证通过)
- [x] 前端 Vue 骨架,三层打通(Vite+Vue3+Element Plus,经 /api 代理增删改查跑通)

**第 1 周 · 核心系统(能用、能演示)**
- [x] 论文登记 增/删/改/查(后端 5 接口 + 前端列表/弹窗表单,全字段按说明书 §3.1.1 / §6.2)
- [ ] 登录 + 基础权限
- [ ] 基础检索 + ECharts 统计看板(先用 MySQL)
- [ ] DOI 自动补全(对接 Crossref,§5 接口①)

**第 2 周 · 企业级骨架**
- [ ] RBAC 角色权限 + 部门数据隔离(§2)
- [ ] 操作审计日志(§4,不可篡改)
- [ ] Redis 缓存(复用本机 valkey)

**第 3 周 · 🦀 硬核亮点**
- [ ] Rust 高性能检索原生模块(napi-rs,内存倒排索引 + 中文分词)
- [ ] benchmark 性能对比(JS vs Rust)+ 接入后端(满足 §4 检索 <1s)

**第 4 周 · 交付**
- [ ] Docker 一键部署整套
- [ ] 数据大屏打磨、文档完善、答辩准备
- [x] 专利 / 软著建表 + 基础登记(配置驱动复用组件,字段按 §3.1.2 / §3.1.3 / §6.2)
- [ ] 扩展:年费提醒(有余力)

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
