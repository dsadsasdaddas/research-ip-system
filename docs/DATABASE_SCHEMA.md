# 正式数据库建表说明

本项目不依赖 TypeORM `synchronize` 自动建表。正式数据库结构以根目录 SQL 为准：

```txt
database/schema.sql   # HTML 需求对应的完整正式表结构
database/seed.sql     # 默认部门、用户、RBAC、接口配置、数据字典
database/migrations/003_upgrade_existing_tables.sql # 将历史 TypeORM 自动建表升级到正式字段
```

## 建表范围

`schema.sql` 覆盖以下正式业务分组：

1. 组织 / 用户 / RBAC：`department`、`user`、`rbac_role`、`rbac_permission`、`rbac_role_permission`
2. 数据字典：`dictionary_type`、`dictionary_item`
3. 成果主业务：`paper`、`patent`、`copyright`、`transform`、`transform_distribution`
4. 附件档案：`attachment`、`attachment_version`、`attachment_access_log`
5. 费用缴费：`fee`、`fee_plan`、`fee_payment_record`、`fee_voucher`
6. 提醒通知：`reminder_rule`、`reminder_task`、`notification_message`、`notification_send_log`
7. 审批流程：`approval_flow`、`approval_flow_node`、`approval_instance`、`approval_record`
8. 审计 / 搜索 / 报表：`audit_log`、`search_log`、`report_template`、`report_export_log`、`scheduled_report_task`
9. 外部接口 / 涉密 / 运维：`integration_config`、`integration_log`、`integration_mapping`、`integration_alert`、`secret_access_grant`、`secret_access_log`、`backup_log`

共 39 张表。

## 本地初始化

```bash
mysql -uroot -proot1234 -e "DROP DATABASE IF EXISTS research_db; CREATE DATABASE research_db DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -proot1234 research_db < database/schema.sql
mysql -uroot -proot1234 research_db < database/seed.sql
# 如果是已有旧库，再执行一次升级脚本
mysql -uroot -proot1234 research_db < database/migrations/003_upgrade_existing_tables.sql
```

Docker MySQL 可用：

```bash
docker exec -i homeworl-mysql mysql -uroot -proot1234 -e "DROP DATABASE IF EXISTS research_db; CREATE DATABASE research_db DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;"
docker exec -i homeworl-mysql mysql -uroot -proot1234 research_db < database/schema.sql
docker exec -i homeworl-mysql mysql -uroot -proot1234 research_db < database/seed.sql
# 如果是已有旧库，再执行一次升级脚本
docker exec -i homeworl-mysql mysql -uroot -proot1234 research_db < database/migrations/003_upgrade_existing_tables.sql
```

后端默认：

```txt
TYPEORM_SYNC=false
```

只有临时开发空库调试时才允许设为 `true`。
