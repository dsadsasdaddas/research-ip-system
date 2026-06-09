# 接口清单与权限矩阵

> 全局前缀 `/api`。除登录外,所有接口都需要在请求头带 `Authorization: Bearer <token>`。
> token 由 `POST /api/auth/login` 获取,有效期 8 小时。

## 鉴权说明

- **无 token / token 伪造或过期** → `401 Unauthorized`
- **token 有效但角色不够** → `403 Forbidden`
- 角色见 [TEST_ACCOUNTS.md](TEST_ACCOUNTS.md)。

## 接口一览(51 条)

| 方法 | 路径 | 说明 | 需登录 | 角色限制 |
|------|------|------|:---:|------|
| POST | `/api/auth/login` | 登录,返回 token + 用户信息 | ❌ 公开 | — |
| GET  | `/api` | 健康检查(Hello World) | ❌ 公开 | — |
| **论文** |
| POST | `/api/papers` | 新增论文 | ✅ | 任意登录 |
| GET  | `/api/papers` | 论文列表(`?keyword=` 按标题搜) | ✅ | 任意登录 |
| GET  | `/api/papers/doi-lookup` | 按 DOI 查重 | ✅ | 任意登录 |
| GET  | `/api/papers/:id` | 论文详情 | ✅ | 任意登录 |
| PATCH| `/api/papers/:id` | 更新论文 | ✅ | 任意登录 |
| DELETE| `/api/papers/:id` | 删除论文 | ✅ | 任意登录 |
| **专利** |
| POST | `/api/patents` | 新增专利 | ✅ | 任意登录 |
| GET  | `/api/patents` | 专利列表(`?keyword=`) | ✅ | 任意登录 |
| GET  | `/api/patents/:id` | 专利详情 | ✅ | 任意登录 |
| PATCH| `/api/patents/:id` | 更新专利 | ✅ | 任意登录 |
| DELETE| `/api/patents/:id` | 删除专利 | ✅ | 任意登录 |
| **软著** |
| POST | `/api/copyrights` | 新增软著 | ✅ | 任意登录 |
| GET  | `/api/copyrights` | 软著列表(`?keyword=`) | ✅ | 任意登录 |
| GET  | `/api/copyrights/:id` | 软著详情 | ✅ | 任意登录 |
| PATCH| `/api/copyrights/:id` | 更新软著 | ✅ | 任意登录 |
| DELETE| `/api/copyrights/:id` | 删除软著 | ✅ | 任意登录 |
| **成果转化** |
| POST | `/api/transforms` | 新增转化记录 | ✅ | 任意登录 |
| GET  | `/api/transforms` | 转化列表(`?keyword=`) | ✅ | 任意登录 |
| GET  | `/api/transforms/:id` | 转化详情 | ✅ | 任意登录 |
| PATCH| `/api/transforms/:id` | 更新转化 | ✅ | 任意登录 |
| DELETE| `/api/transforms/:id` | 删除转化 | ✅ | 任意登录 |
| **费用** |
| POST | `/api/fees` | 新增费用 | ✅ | 任意登录 |
| GET  | `/api/fees` | 费用列表 | ✅ | 任意登录 |
| GET  | `/api/fees/alert-summary` | 到期预警汇总 | ✅ | 任意登录 |
| GET  | `/api/fees/:id` | 费用详情 | ✅ | 任意登录 |
| PATCH| `/api/fees/:id` | 更新费用 | ✅ | 任意登录 |
| DELETE| `/api/fees/:id` | 删除费用 | ✅ | 任意登录 |
| POST | `/api/fees/generate-plans` | 批量生成缴费计划 | ✅ | 任意登录 |
| **提醒** |
| GET  | `/api/reminders/tasks` | 提醒任务列表 | ✅ | 任意登录 |
| GET  | `/api/reminders/tasks/summary` | 提醒任务汇总 | ✅ | 任意登录 |
| POST | `/api/reminders/tasks` | 新建提醒任务 | ✅ | 任意登录 |
| PATCH| `/api/reminders/tasks/:id` | 更新提醒任务 | ✅ | 任意登录 |
| DELETE| `/api/reminders/tasks/:id` | 删除提醒任务 | ✅ | 任意登录 |
| POST | `/api/reminders/tasks/:id/confirm` | 确认提醒 | ✅ | 任意登录 |
| POST | `/api/reminders/tasks/check-second-remind` | 触发二次提醒检查 | ✅ | 任意登录 |
| GET  | `/api/reminders/rules` | 提醒规则列表 | ✅ | 任意登录 |
| POST | `/api/reminders/rules` | 新建提醒规则 | ✅ | 任意登录 |
| PATCH| `/api/reminders/rules/:id` | 更新提醒规则 | ✅ | 任意登录 |
| DELETE| `/api/reminders/rules/:id` | 删除提醒规则 | ✅ | 任意登录 |
| **附件** |
| POST | `/api/attachments/upload` | 上传附件 | ✅ | 任意登录 |
| GET  | `/api/attachments` | 附件列表(`?relationType=&relationId=`) | ✅ | 任意登录 |
| GET  | `/api/attachments/:id/download` | 下载附件 | ✅ | 任意登录 |
| DELETE| `/api/attachments/:id` | 删除附件 | ✅ | 任意登录 |
| **检索 / 统计** |
| GET  | `/api/search` | 全局检索(`?keyword=`) | ✅ | 任意登录 |
| GET  | `/api/stats` | 统计看板数据 | ✅ | 任意登录 |
| **用户管理** |
| GET  | `/api/users` | 用户列表 | ✅ | 🔒 仅 `sys_admin` |
| POST | `/api/users` | 新建用户 | ✅ | 🔒 仅 `sys_admin` |
| PATCH| `/api/users/:id` | 更新用户 | ✅ | 🔒 仅 `sys_admin` |
| **审计日志** |
| GET  | `/api/audit-logs` | 审计日志查询 | ✅ | 🔒 `auditor` / `sys_admin` / `leader` |

## 测试

后端用 **Jest + supertest** 写了端到端(e2e)测试,覆盖每个接口的正常路径 + 安全性。

```bash
cd backend
npm run test:e2e        # 跑全部 e2e(需 MySQL 已启动)
```

测试文件(`backend/test/`):

| 文件 | 覆盖内容 |
|------|----------|
| `auth.e2e-spec.ts` | 登录正常/失败、用户名枚举防护、token 有效性与防伪 |
| `security.e2e-spec.ts` | **安全矩阵**:所有接口无 token → 401;用户管理仅 sys_admin;审计日志角色限制 |
| `resources.e2e-spec.ts` | 各资源 CRUD 生命周期、入参校验(400)、whitelist 剔除未知字段、只读接口冒烟 |
| `helpers.ts` | 启动测试应用(与 main.ts 同配置)+ 登录/Bearer 工具 |

共 **78 个用例,全部通过**。
