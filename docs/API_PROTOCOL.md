# 简版接口协议

## 1. 基础路径

所有后端接口统一走：

```txt
/api/xxx
```

登录接口：

```txt
POST /api/auth/login
```

## 2. 鉴权

除登录外，所有接口必须带 JWT：

```http
Authorization: Bearer <token>
```

## 3. 业务归属字段

业务归属字段必须由后端根据 `AuthUser` 注入，前端不得决定：

```txt
deptId = user.deptId
createUser = user.username
```

如果 DTO 中暂时还保留 `deptId/createUser`，Service 层也必须忽略前端传值。

## 4. 列表返回

新增列表接口优先统一为分页结构：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

旧接口暂可返回数组，但后续逐步迁移到分页结构。

## 5. 错误返回

使用 NestJS 默认错误结构：

```json
{
  "statusCode": 400,
  "message": "参数错误",
  "error": "Bad Request"
}
```

常见状态码：

| 状态码 | 含义 |
|---|---|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未登录 / token 失效 |
| 403 | 无权限 |
| 404 | 数据不存在 |
| 500 | 服务端错误 |

## 6. 权限规则

部门隔离角色：

```txt
researcher / dept_secretary / dept_admin
```

只能访问：

```txt
dept_id = user.deptId
```

全院角色：

```txt
leader / secret_admin / auditor / sys_admin
```

可访问全院数据。

审计员：

```txt
auditor 只读，禁止 POST/PATCH/DELETE
```

## 7. Rust 搜索接口

搜索接口：

```txt
GET /api/search?q=关键词&types=paper,patent,copyright
```

返回必须包含：

```json
{
  "engine": "rust",
  "elapsedMs": 63.6,
  "total": 1,
  "items": []
}
```

## 8. 确定接口清单 v1

> 本节记录当前项目已经确定的接口路径。后续新增接口必须尽量延续这些路径和返回习惯。

### 8.1 认证

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | `/api/auth/login` | 登录，返回 JWT 和用户信息 | 否 |

请求：

```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

返回：

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "admin",
    "realName": "系统管理员",
    "role": "sys_admin",
    "deptId": null
  }
}
```

### 8.2 成果登记通用 CRUD

以下资源共用同一套 CRUD 协议：

| 资源 | 路径前缀 | 说明 |
|---|---|---|
| 论文 | `/api/papers` | 论文登记 |
| 专利 | `/api/patents` | 专利登记 |
| 软著 | `/api/copyrights` | 软件著作权登记 |
| 成果转化 | `/api/transforms` | 成果转化项目 |

通用接口：

| 方法 | 路径 | 说明 | Query/Body |
|---|---|---|---|
| GET | `/{resource}` | 列表 | `keyword?` |
| GET | `/{resource}/:id` | 详情 | path: `id` |
| POST | `/{resource}` | 新增 | JSON body |
| PATCH | `/{resource}/:id` | 更新 | path: `id` + JSON body |
| DELETE | `/{resource}/:id` | 删除 | path: `id` |

示例：

```txt
GET /api/papers?keyword=深度学习
GET /api/papers/1
POST /api/papers
PATCH /api/papers/1
DELETE /api/papers/1
```

删除返回统一使用：

```json
{
  "deleted": true,
  "id": 1
}
```

### 8.3 论文 DOI 自动补全

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/papers/doi-lookup?doi=10.xxxx/xxxx` | 通过 CrossRef 查询 DOI 元数据 | 是 |

返回字段直接映射到论文表单：

```json
{
  "doi": "10.xxxx/xxxx",
  "title": "论文标题",
  "firstAuthor": "第一作者",
  "authors": "作者列表",
  "journal": "期刊名称",
  "issnCn": "ISSN",
  "volumePage": "Vol.1, 1-10",
  "publishYear": 2026,
  "citationCount": 0,
  "summary": "摘要"
}
```

### 8.4 Rust 全文检索

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/search` | Rust 全文检索 | 是 |

Query：

| 参数 | 类型 | 说明 |
|---|---|---|
| `q` | string | 搜索关键词 |
| `types` | string | 可选，逗号分隔：`paper,patent,copyright` |

示例：

```txt
GET /api/search?q=深度学习&types=paper,patent,copyright
```

返回必须包含 Rust 引擎标记和耗时：

```json
{
  "engine": "rust",
  "elapsedMs": 63.6,
  "total": 1,
  "items": [
    {
      "type": "paper",
      "typeLabel": "论文",
      "id": 1,
      "title": "基于深度学习的科研成果智能管理方法研究",
      "meta": "王悦,李明 · 计算机学报 · 2026",
      "createTime": "2026-06-05T10:18:19.296Z",
      "score": 23
    }
  ]
}
```

约束：

- 搜索接口必须走 TypeScript → Rust，不允许静默 fallback 到 MySQL。
- Rust addon 缺失或调用失败时应直接报错，方便开发期发现问题。
- CI 必须验证 10000 条测试数据搜索耗时不超过 1000ms。

### 8.5 费用管理

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/fees` | 费用列表 |
| GET | `/api/fees/:id` | 费用详情 |
| POST | `/api/fees` | 新增费用 |
| PATCH | `/api/fees/:id` | 更新费用 |
| DELETE | `/api/fees/:id` | 删除费用 |
| GET | `/api/fees/alert-summary` | 费用预警汇总 |
| POST | `/api/fees/generate-plans` | 根据专利生成缴费计划 |

`GET /api/fees` 支持 Query：

| 参数 | 说明 |
|---|---|
| `keyword` | 成果名称关键词 |
| `relationType` | `patent` / `copyright` |
| `payStatus` | `pending` / `paid` / `overdue` / `cancelled` |
| `alertLevel` | `0/1/2/3/4`，对应正常/30天/15天/7天/逾期 |

### 8.6 申报提醒

#### 提醒任务

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/reminders/tasks` | 提醒任务列表 |
| GET | `/api/reminders/tasks/summary` | 提醒任务汇总 |
| POST | `/api/reminders/tasks` | 新增提醒任务 |
| PATCH | `/api/reminders/tasks/:id` | 更新提醒任务 |
| DELETE | `/api/reminders/tasks/:id` | 删除提醒任务 |
| POST | `/api/reminders/tasks/:id/confirm` | 确认回执 |
| POST | `/api/reminders/tasks/check-second-remind` | 检查并标记二次催办 |

`GET /api/reminders/tasks` 支持 Query：

| 参数 | 说明 |
|---|---|
| `keyword` | 标题关键词 |
| `remindLevel` | `普通` / `重要` / `紧急` |
| `isConfirm` | `true` / `false` |

#### 提醒规则

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/reminders/rules` | 规则列表 |
| POST | `/api/reminders/rules` | 新增规则 |
| PATCH | `/api/reminders/rules/:id` | 更新规则 |
| DELETE | `/api/reminders/rules/:id` | 删除规则 |

### 8.7 附件

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/attachments?relationType=paper&relationId=1` | 附件列表 |
| POST | `/api/attachments/upload` | 上传附件，`multipart/form-data` |
| GET | `/api/attachments/:id/download` | 下载附件 |
| DELETE | `/api/attachments/:id` | 删除附件 |

上传字段：

| 字段 | 说明 |
|---|---|
| `file` | 文件 |
| `relationType` | 关联类型：`paper/patent/copyright/transform/fee` |
| `relationId` | 关联业务 ID |
| `remark` | 备注，可选 |

### 8.8 统计看板

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/stats` | 获取统计看板全部数据 |

返回包含：

```txt
totals / trend / typeDist / deptRank / patentStatus / transformAmounts / funnel
```

### 8.9 审计日志

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/audit-logs` | 查询操作日志 | `auditor / sys_admin / leader` |

支持 Query：

| 参数 | 说明 |
|---|---|
| `keyword` | 路径/请求体关键词 |
| `module` | 模块 |
| `action` | 操作类型 |
| `username` | 操作人 |
| `page` | 页码 |
| `pageSize` | 每页数量 |

返回分页结构：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 50
}
```

### 8.10 用户管理

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/users` | 用户列表 | `sys_admin` |
| GET | `/api/users/:id` | 用户详情 | `sys_admin` |
| POST | `/api/users` | 新增用户 | `sys_admin` |
| PATCH | `/api/users/:id` | 更新用户 | `sys_admin` |
| DELETE | `/api/users/:id` | 删除用户 | `sys_admin` |

返回用户对象不包含密码哈希。

### 8.11 部门管理

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/departments` | 部门列表，可传 `keyword` | `sys_admin` |
| GET | `/api/departments/:id` | 部门详情 | `sys_admin` |
| POST | `/api/departments` | 新增部门 | `sys_admin` |
| PATCH | `/api/departments/:id` | 更新部门 | `sys_admin` |
| DELETE | `/api/departments/:id` | 删除部门 | `sys_admin` |

前端页面：`/users`、`/departments`，仅系统管理员可见。

### 8.12 外部接口配置中心

> 用于落地 Crossref / Scopus / OpenAlex / CNIPA / HR-LDAP / 财务 / 邮件 / 短信等外部系统接入要求。接口配置只保存环境变量名，不直接保存密钥。

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/integrations/configs` | 查看接口配置列表 | `sys_admin` |
| POST | `/api/integrations/configs` | 新增接口配置 | `sys_admin` |
| GET | `/api/integrations/configs/:id` | 接口配置详情 | `sys_admin` |
| PATCH | `/api/integrations/configs/:id` | 更新接口配置 | `sys_admin` |
| DELETE | `/api/integrations/configs/:id` | 删除接口配置 | `sys_admin` |
| POST | `/api/integrations/configs/:id/test` | 测试接口连通性，带超时和重试 | `sys_admin` |
| GET | `/api/integrations/logs` | 查看接口调用/测试日志 | `sys_admin` |

已确定接口类型：

```txt
crossref   DOI/论文数据
scopus     论文数据
openalex   论文数据
cnipa      专利法律状态/年费同步
hr_ldap    人员/部门同步
finance    财务凭证/对账
email      邮件通知
sms        短信通知
```

配置字段：

```json
{
  "type": "crossref",
  "name": "Crossref DOI 查询",
  "baseUrl": "https://api.crossref.org",
  "apiKeyEnv": null,
  "isEnabled": true,
  "timeoutMs": 8000,
  "retryCount": 3,
  "fallbackMode": "manual",
  "extra": null
}
```

测试返回：

```json
{
  "type": "crossref",
  "enabled": true,
  "success": true,
  "elapsedMs": 123,
  "statusCode": 200,
  "fallbackMode": "manual",
  "message": "接口测试成功"
}
```

日志返回分页结构：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 50
}
```

约束：

- 接口地址、开关、超时时间、重试次数、降级模式统一由配置中心管理。
- 密钥只存环境变量名，例如 `SCOPUS_API_KEY`，不允许把真实密钥写入数据库或代码。
- 接口测试/调用失败必须写入 `integration_log`，用于后续告警和运维监控。
- 当前已落地配置中心、重试、日志、降级标记；真实业务同步接口后续在对应模块内接入。
- 前端页面已接入 `/integrations`，用于系统管理员查看、编辑、测试接口配置和查看日志。

### 8.13 暂不承诺的接口

以下需求暂不定义正式接口，等实现时再补：

- 审批流程接口
- 数据字典接口
- 报表导出接口
- 数据备份/恢复接口
- 涉密授权接口
- 检索日志/热门关键词接口
