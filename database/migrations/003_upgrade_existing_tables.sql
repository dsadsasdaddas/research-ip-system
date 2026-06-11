-- 将已由 TypeORM 自动同步生成的旧表升级到正式 schema 的补充字段。
-- 可重复执行：仅当字段不存在时才 ADD COLUMN。

DELIMITER $$
DROP PROCEDURE IF EXISTS add_column_if_missing $$
CREATE PROCEDURE add_column_if_missing(
  IN p_schema VARCHAR(128),
  IN p_table VARCHAR(128),
  IN p_column VARCHAR(128),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = p_schema AND table_name = p_table AND column_name = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_schema, '`.`', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

SET @db = DATABASE();

-- department
CALL add_column_if_missing(@db, 'department', 'create_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间''');
CALL add_column_if_missing(@db, 'department', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');
CALL add_column_if_missing(@db, 'department', 'is_active', 'BOOLEAN NOT NULL DEFAULT TRUE COMMENT ''是否启用''');

-- user
CALL add_column_if_missing(@db, 'user', 'last_login_time', 'DATETIME NULL COMMENT ''最后登录时间''');
CALL add_column_if_missing(@db, 'user', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');

-- paper
CALL add_column_if_missing(@db, 'paper', 'approval_status', 'VARCHAR(30) NOT NULL DEFAULT ''draft'' COMMENT ''审批状态''');
CALL add_column_if_missing(@db, 'paper', 'archive_status', 'VARCHAR(30) NOT NULL DEFAULT ''normal'' COMMENT ''归档状态''');
CALL add_column_if_missing(@db, 'paper', 'cancel_reason', 'TEXT NULL COMMENT ''注销/作废原因''');
CALL add_column_if_missing(@db, 'paper', 'is_deleted', 'BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''软删除标记''');
CALL add_column_if_missing(@db, 'paper', 'remark', 'VARCHAR(255) NULL COMMENT ''备注''');
CALL add_column_if_missing(@db, 'paper', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');

-- patent
CALL add_column_if_missing(@db, 'patent', 'approval_status', 'VARCHAR(30) NOT NULL DEFAULT ''draft'' COMMENT ''审批状态''');
CALL add_column_if_missing(@db, 'patent', 'archive_status', 'VARCHAR(30) NOT NULL DEFAULT ''normal'' COMMENT ''归档状态''');
CALL add_column_if_missing(@db, 'patent', 'cancel_reason', 'TEXT NULL COMMENT ''注销/作废原因''');
CALL add_column_if_missing(@db, 'patent', 'last_status_sync_time', 'DATETIME NULL COMMENT ''最近外部状态同步时间''');
CALL add_column_if_missing(@db, 'patent', 'is_deleted', 'BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''软删除标记''');
CALL add_column_if_missing(@db, 'patent', 'remark', 'VARCHAR(255) NULL COMMENT ''备注''');
CALL add_column_if_missing(@db, 'patent', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');

-- copyright
CALL add_column_if_missing(@db, 'copyright', 'approval_status', 'VARCHAR(30) NOT NULL DEFAULT ''draft'' COMMENT ''审批状态''');
CALL add_column_if_missing(@db, 'copyright', 'archive_status', 'VARCHAR(30) NOT NULL DEFAULT ''normal'' COMMENT ''归档状态''');
CALL add_column_if_missing(@db, 'copyright', 'cancel_reason', 'TEXT NULL COMMENT ''注销/作废原因''');
CALL add_column_if_missing(@db, 'copyright', 'is_deleted', 'BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''软删除标记''');
CALL add_column_if_missing(@db, 'copyright', 'remark', 'VARCHAR(255) NULL COMMENT ''备注''');
CALL add_column_if_missing(@db, 'copyright', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');

-- transform
CALL add_column_if_missing(@db, 'transform', 'follow_up_status', 'VARCHAR(50) NOT NULL DEFAULT ''pending'' COMMENT ''后续效益填报状态''');
CALL add_column_if_missing(@db, 'transform', 'approval_status', 'VARCHAR(30) NOT NULL DEFAULT ''draft'' COMMENT ''审批状态''');
CALL add_column_if_missing(@db, 'transform', 'archive_status', 'VARCHAR(30) NOT NULL DEFAULT ''normal'' COMMENT ''归档状态''');
CALL add_column_if_missing(@db, 'transform', 'is_deleted', 'BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''软删除标记''');
CALL add_column_if_missing(@db, 'transform', 'remark', 'VARCHAR(255) NULL COMMENT ''备注''');
CALL add_column_if_missing(@db, 'transform', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');

-- attachment
CALL add_column_if_missing(@db, 'attachment', 'secret_level', 'VARCHAR(20) NOT NULL DEFAULT ''公开'' COMMENT ''附件密级''');
CALL add_column_if_missing(@db, 'attachment', 'storage_mode', 'VARCHAR(30) NOT NULL DEFAULT ''local'' COMMENT ''local/encrypted/oss''');
CALL add_column_if_missing(@db, 'attachment', 'download_permission', 'VARCHAR(100) NULL COMMENT ''下载权限策略''');
CALL add_column_if_missing(@db, 'attachment', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');

-- fee
CALL add_column_if_missing(@db, 'fee', 'approval_status', 'VARCHAR(30) NOT NULL DEFAULT ''draft'' COMMENT ''缴费审批状态''');

-- reminder_rule
CALL add_column_if_missing(@db, 'reminder_rule', 'update_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''');

DROP PROCEDURE IF EXISTS add_column_if_missing;
