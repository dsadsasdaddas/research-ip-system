# 测试账号

> ⚠️ 仅本地开发/演示用，**不投入生产**。
> 全部由 `UsersService.seedAdmin()` 在首次启动（user 表为空）时自动创建。

## 示例部门

| ID | 名称 |
|----|------|
| 1 | 计算机研究所 |
| 2 | 电子工程研究所 |

> ID 由数据库自增，以实际为准。

## 账号一览

| 用户名 | 密码 | 角色（UserRole） | 数据范围 | 所属部门 |
|--------|------|------------------|----------|----------|
| admin    | `Admin@123` | sys_admin       | 全局         | —        |
| leader   | `Test@123`  | leader          | 全院只读+审批 | —        |
| auditor  | `Test@123`  | auditor         | 全院只读      | —        |
| secret   | `Test@123`  | secret_admin    | 涉密成果       | —        |
| cs_admin | `Test@123`  | dept_admin      | 本部门        | 计算机研究所 |
| cs_sec   | `Test@123`  | dept_secretary  | 本部门        | 计算机研究所 |
| cs_user  | `Test@123`  | researcher      | 本人/本部门    | 计算机研究所 |
| ee_user  | `Test@123`  | researcher      | 本人/本部门    | 电子工程研究所 |

## 用法

1. 起库：`docker compose up -d`
2. 起后端：`cd backend && npm run start:dev`
   首次启动若 user 表为空，会自动播种以上账号并在控制台打印列表。
3. 起前端：`cd frontend && npm run dev`，浏览器登录。

## 权限验证建议路径

- 部门隔离：`cs_user` 登录只能看到计算机所的论文/专利/软著；`ee_user` 切换登录后看到的是另一拨数据。
- 全院视角：`leader` / `auditor` 登录能看到所有部门。
- 涉密成果：`secret` 登录可见标记涉密的条目，其他角色（除 sys_admin）不可见。
- 审计日志：仅 `auditor` / `leader` / `admin` 能进 "操作日志" 菜单。
- 写权限：`auditor` 只读，提交表单应被拒。

## 重新播种

`seedAdmin()` 只在 user 表为空时跑。要重新播种：

```bash
docker compose down -v   # 清掉数据库 volume
docker compose up -d
cd backend && npm run start:dev
```

或登 MySQL 手动 `TRUNCATE user; TRUNCATE department;`。
