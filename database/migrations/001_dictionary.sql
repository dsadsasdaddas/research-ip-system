-- 数据字典正式业务表：字典类型 + 字典项
-- 说明：不使用单表简化结构，支持系统内置、作用域、默认项、颜色、启停、排序。

CREATE TABLE IF NOT EXISTS dictionary_type (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  code VARCHAR(100) NOT NULL COMMENT '字典类型编码，例如 secret_level',
  name VARCHAR(100) NOT NULL COMMENT '字典类型名称，例如 密级',
  scope VARCHAR(50) NOT NULL DEFAULT 'business' COMMENT '作用域：system/business/security/integration',
  is_system BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否系统内置，内置类型不建议删除',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  remark VARCHAR(255) NULL COMMENT '备注',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_dictionary_type_code (code),
  KEY idx_dictionary_type_scope (scope),
  KEY idx_dictionary_type_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型表';

CREATE TABLE IF NOT EXISTS dictionary_item (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  type_code VARCHAR(100) NOT NULL COMMENT '所属字典类型编码',
  label VARCHAR(100) NOT NULL COMMENT '显示名称',
  value VARCHAR(100) NOT NULL COMMENT '实际值',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序号，越小越靠前',
  color VARCHAR(30) NULL COMMENT '前端标签颜色，例如 success/warning/danger/info',
  is_default BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否默认项',
  is_system BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否系统内置，内置项不建议删除',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  remark VARCHAR(255) NULL COMMENT '备注',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_dictionary_item_type_value (type_code, value),
  KEY idx_dictionary_item_type (type_code),
  KEY idx_dictionary_item_active (is_active),
  KEY idx_dictionary_item_sort (type_code, sort_order),
  CONSTRAINT fk_dictionary_item_type FOREIGN KEY (type_code) REFERENCES dictionary_type(code)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项表';
