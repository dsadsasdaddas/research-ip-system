-- 004_audit_log_field_level.sql
-- §6.2 字段级变更日志:为 audit_log 增加字段级变更列(operate_type / table_name / record_id /
--   old_value / new_value / ip_address / operate_time)。全部允许 NULL,与现有 HTTP 级日志共存。
-- 可重复执行:仅当列不存在时才 ADD COLUMN。

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

CALL add_column_if_missing(@db, 'audit_log', 'operate_type', 'VARCHAR(20) NULL COMMENT ''字段级操作类型:create/update/delete''');
CALL add_column_if_missing(@db, 'audit_log', 'table_name',  'VARCHAR(50) NULL COMMENT ''变更的表名''');
CALL add_column_if_missing(@db, 'audit_log', 'record_id',   'INT NULL COMMENT ''变更的记录主键''');
CALL add_column_if_missing(@db, 'audit_log', 'old_value',   'JSON NULL COMMENT ''变更前的行(update/delete)''');
CALL add_column_if_missing(@db, 'audit_log', 'new_value',   'JSON NULL COMMENT ''变更后的行(update)''');
CALL add_column_if_missing(@db, 'audit_log', 'ip_address',  'VARCHAR(50) NULL COMMENT ''字段级日志来源IP(尽力而为)''');
CALL add_column_if_missing(@db, 'audit_log', 'operate_time','DATETIME NULL COMMENT ''字段级变更发生时间''');

-- 字段级查询索引(表/记录/操作类型)
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'audit_log' AND index_name = 'idx_audit_field'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE `audit_log` ADD INDEX `idx_audit_field` (`table_name`, `record_id`, `operate_type`)',
  'DO 0');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
