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

### 3. 启动前端 *(待搭建)*

```bash
cd frontend
npm install
npm run dev
```

## 项目结构

```
homeworl/
├── docker-compose.yml      # 本地 MySQL 配置
├── backend/                # NestJS 后端(端口 3001)
├── frontend/               # Vue 前端(待搭建)
├── 研究院科研成果管理系统说明.html   # 需求说明书
├── README.md               # 本文件
└── CLAUDE.md               # 给 AI 协作的项目说明
```

## 开发路线图

- [x] **第 0 步** 环境配置:Node / Git / Docker + MySQL 跑通
- [x] **第 0 步(续 a)** 后端 NestJS 骨架(端口 3001),冒烟测试通过
- [ ] **第 0 步(续 b)** 前端 Vue 骨架 + 后端连上 MySQL,三层打通
- [ ] **第 1 步** 论文登记:增 / 删 / 改 / 查
- [ ] **第 2 步** 登录 + 简单权限(本人只看本人)
- [ ] **第 3 步** 全文检索 + ECharts 统计看板
- [ ] **第 4 步** 亮点:DOI 自动补全(对接 Crossref)
- [ ] 扩展:专利 / 软著建表登记、年费提醒

## 开发日志

| 日期 | 进展 |
|------|------|
| 2026-06-04 | 初始化 git 仓库;用 Docker 搭好 MySQL(research_db);补充 README / CLAUDE 文档 |
| 2026-06-05 | 用 NestJS 脚手架生成后端骨架,端口改为 3001(避开 One API),冒烟测试返回 Hello World |
