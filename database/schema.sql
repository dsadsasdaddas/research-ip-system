-- 科研成果与知识产权管理系统正式数据库结构
-- 依据：研究院科研成果管理系统说明.html
-- 说明：生产/CI 应使用 TYPEORM_SYNC=false，由本 schema 建表；TypeORM Entity 只做代码映射。

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 组织 / 用户 / RBAC
-- ============================================================
CREATE TABLE IF NOT EXISTS department (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  parent_id INT NULL COMMENT '上级部门ID',
  description VARCHAR(255) NULL COMMENT '备注',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  UNIQUE KEY uk_department_name (name),
  KEY idx_department_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

CREATE TABLE IF NOT EXISTS `user` (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  username VARCHAR(50) NOT NULL COMMENT '登录用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码哈希 bcrypt',
  real_name VARCHAR(50) NULL COMMENT '真实姓名',
  email VARCHAR(100) NULL COMMENT '邮箱',
  role ENUM('researcher','dept_secretary','dept_admin','leader','secret_admin','auditor','sys_admin') NOT NULL DEFAULT 'researcher' COMMENT '主角色',
  dept_id INT NULL COMMENT '所属部门ID',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  last_login_time DATETIME NULL COMMENT '最后登录时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_user_username (username),
  KEY idx_user_dept (dept_id),
  KEY idx_user_role (role),
  KEY idx_user_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

CREATE TABLE IF NOT EXISTS rbac_role (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  code VARCHAR(100) NOT NULL COMMENT '角色编码',
  name VARCHAR(100) NOT NULL COMMENT '角色名称',
  data_scope VARCHAR(50) NOT NULL DEFAULT 'dept' COMMENT '数据范围：self/dept/all/custom',
  is_system BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否系统内置',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  remark VARCHAR(255) NULL COMMENT '备注',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rbac_role_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='RBAC角色表';

CREATE TABLE IF NOT EXISTS rbac_permission (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  code VARCHAR(150) NOT NULL COMMENT '权限编码',
  name VARCHAR(100) NOT NULL COMMENT '权限名称',
  module VARCHAR(100) NOT NULL COMMENT '所属模块',
  action VARCHAR(50) NOT NULL COMMENT '动作 read/create/update/delete/export/approve',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rbac_permission_code (code),
  KEY idx_rbac_permission_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='RBAC权限表';

CREATE TABLE IF NOT EXISTS rbac_role_permission (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_code VARCHAR(100) NOT NULL COMMENT '角色编码',
  permission_code VARCHAR(150) NOT NULL COMMENT '权限编码',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rbac_role_permission (role_code, permission_code),
  KEY idx_rbac_role_permission_role (role_code),
  KEY idx_rbac_role_permission_perm (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ============================================================
-- 2. 数据字典
-- ============================================================
CREATE TABLE IF NOT EXISTS dictionary_type (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  code VARCHAR(100) NOT NULL COMMENT '字典类型编码，例如 secret_level',
  name VARCHAR(100) NOT NULL COMMENT '字典类型名称，例如 密级',
  scope VARCHAR(50) NOT NULL DEFAULT 'business' COMMENT '作用域：system/business/security/integration',
  is_system BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否系统内置',
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
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序号',
  color VARCHAR(30) NULL COMMENT '前端标签颜色',
  is_default BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否默认项',
  is_system BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否系统内置',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  remark VARCHAR(255) NULL COMMENT '备注',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_dictionary_item_type_value (type_code, value),
  KEY idx_dictionary_item_type (type_code),
  KEY idx_dictionary_item_active (is_active),
  KEY idx_dictionary_item_sort (type_code, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项表';

-- ============================================================
-- 3. 成果主业务
-- ============================================================
CREATE TABLE IF NOT EXISTS paper (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  title VARCHAR(500) NOT NULL COMMENT '论文标题',
  doi VARCHAR(100) NULL COMMENT 'DOI',
  first_author VARCHAR(100) NULL COMMENT '第一作者',
  corresponding_author VARCHAR(100) NULL COMMENT '通讯作者',
  authors TEXT NULL COMMENT '院内作者列表',
  outer_authors TEXT NULL COMMENT '外单位合作作者',
  cooperate_unit VARCHAR(255) NULL COMMENT '合作单位',
  journal VARCHAR(255) NULL COMMENT '期刊名称',
  issn_cn VARCHAR(50) NULL COMMENT 'ISSN/CN号',
  volume_page VARCHAR(100) NULL COMMENT '卷期页码',
  publish_year INT NULL COMMENT '发表年份',
  impact_factor DECIMAL(6,3) NULL COMMENT '影响因子',
  citation_count INT NOT NULL DEFAULT 0 COMMENT '被引次数',
  included_type VARCHAR(50) NULL COMMENT '收录情况',
  cas_partition VARCHAR(20) NULL COMMENT '中科院分区',
  status VARCHAR(50) NULL COMMENT '成果状态',
  abstract TEXT NULL COMMENT '摘要',
  secret_level VARCHAR(20) NOT NULL DEFAULT '公开' COMMENT '密级',
  depend_project VARCHAR(255) NULL COMMENT '课题依托项目',
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' COMMENT '审批状态 draft/submitted/approved/rejected/archived',
  archive_status VARCHAR(30) NOT NULL DEFAULT 'normal' COMMENT '归档状态 normal/archived/cancelled',
  cancel_reason TEXT NULL COMMENT '注销/作废原因',
  dept_id INT NULL COMMENT '所属部门ID',
  create_user VARCHAR(100) NULL COMMENT '登记人',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '软删除标记',
  remark VARCHAR(255) NULL COMMENT '备注',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_paper_doi (doi),
  KEY idx_paper_dept (dept_id),
  KEY idx_paper_year (publish_year),
  KEY idx_paper_secret (secret_level),
  KEY idx_paper_status (status),
  KEY idx_paper_approval (approval_status),
  FULLTEXT KEY ft_paper_search (title, authors, abstract)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='论文表';

CREATE TABLE IF NOT EXISTS patent (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  name VARCHAR(500) NOT NULL COMMENT '专利名称',
  inventors TEXT NULL COMMENT '院内发明人',
  outer_inventors TEXT NULL COMMENT '外单位发明人',
  patentee VARCHAR(255) NULL COMMENT '专利权人',
  application_no VARCHAR(100) NULL COMMENT '申请号',
  grant_no VARCHAR(100) NULL COMMENT '授权号',
  filing_date VARCHAR(20) NULL COMMENT '申请日 YYYY-MM-DD',
  grant_date VARCHAR(20) NULL COMMENT '授权日 YYYY-MM-DD',
  patent_type VARCHAR(50) NULL COMMENT '专利类型',
  country VARCHAR(50) NULL DEFAULT '中国' COMMENT '国别',
  next_fee_date VARCHAR(20) NULL COMMENT '年费下次缴费日',
  fee_amount DECIMAL(12,2) NULL COMMENT '年费金额',
  agency VARCHAR(255) NULL COMMENT '代理机构',
  legal_status VARCHAR(50) NOT NULL DEFAULT '申请中' COMMENT '法律状态',
  pct_stage VARCHAR(100) NULL COMMENT 'PCT国际阶段',
  national_stage VARCHAR(100) NULL COMMENT '国家阶段',
  entry_date VARCHAR(20) NULL COMMENT '国际进入日期',
  patent_mark VARCHAR(50) NOT NULL DEFAULT '普通专利' COMMENT '专利标识',
  depend_project VARCHAR(255) NULL COMMENT '课题依托项目',
  fund_source VARCHAR(100) NULL COMMENT '经费来源',
  secret_level VARCHAR(20) NOT NULL DEFAULT '公开' COMMENT '密级',
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' COMMENT '审批状态',
  archive_status VARCHAR(30) NOT NULL DEFAULT 'normal' COMMENT '归档状态',
  cancel_reason TEXT NULL COMMENT '注销/作废原因',
  last_status_sync_time DATETIME NULL COMMENT '最近一次外部状态同步时间',
  dept_id INT NULL COMMENT '所属部门ID',
  create_user VARCHAR(100) NULL COMMENT '登记人',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_patent_application_no (application_no),
  KEY idx_patent_dept (dept_id),
  KEY idx_patent_legal_status (legal_status),
  KEY idx_patent_next_fee (next_fee_date),
  KEY idx_patent_secret (secret_level),
  FULLTEXT KEY ft_patent_search (name, inventors, outer_inventors)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专利表';

CREATE TABLE IF NOT EXISTS copyright (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  name VARCHAR(500) NOT NULL COMMENT '软著名称',
  copyright_owner VARCHAR(255) NULL COMMENT '著作权人',
  registration_no VARCHAR(100) NULL COMMENT '登记号',
  publish_date VARCHAR(20) NULL COMMENT '首次发表日期',
  register_date VARCHAR(20) NULL COMMENT '登记日期',
  version VARCHAR(50) NULL COMMENT '版本号',
  software_type VARCHAR(50) NULL COMMENT '软件类别',
  software_intro TEXT NULL COMMENT '软件功能简介',
  run_env VARCHAR(255) NULL COMMENT '运行环境',
  cooperate_unit VARCHAR(255) NULL COMMENT '合作单位',
  depend_project VARCHAR(255) NULL COMMENT '依托项目',
  secret_level VARCHAR(20) NOT NULL DEFAULT '公开' COMMENT '密级',
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' COMMENT '审批状态',
  archive_status VARCHAR(30) NOT NULL DEFAULT 'normal' COMMENT '归档状态',
  cancel_reason TEXT NULL COMMENT '注销/作废原因',
  dept_id INT NULL COMMENT '所属部门ID',
  create_user VARCHAR(100) NULL COMMENT '登记人',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_copyright_registration_no (registration_no),
  KEY idx_copyright_dept (dept_id),
  KEY idx_copyright_register_date (register_date),
  KEY idx_copyright_secret (secret_level),
  FULLTEXT KEY ft_copyright_search (name, software_intro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='软件著作权表';

CREATE TABLE IF NOT EXISTS transform (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  result_type VARCHAR(20) NULL COMMENT '成果类型 paper/patent/copyright',
  result_id INT NULL COMMENT '关联成果ID',
  contract_no VARCHAR(100) NULL COMMENT '合同编号',
  partner VARCHAR(255) NULL COMMENT '交易对方',
  contract_amount DECIMAL(14,2) NULL COMMENT '合同金额',
  received_amount DECIMAL(14,2) NULL DEFAULT 0 COMMENT '已到账金额',
  transform_date VARCHAR(20) NULL COMMENT '转化日期',
  transform_type VARCHAR(50) NULL COMMENT '转化类型',
  finish_status VARCHAR(50) NOT NULL DEFAULT '合同签订' COMMENT '当前节点',
  abnormal_reason TEXT NULL COMMENT '异常原因',
  distribute_ratio VARCHAR(255) NULL COMMENT '收益分配比例描述',
  follow_up_status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT '后续效益填报状态',
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' COMMENT '审批状态',
  archive_status VARCHAR(30) NOT NULL DEFAULT 'normal' COMMENT '归档状态',
  dept_id INT NULL COMMENT '所属部门ID',
  create_user VARCHAR(100) NULL COMMENT '登记人',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_transform_contract_no (contract_no),
  KEY idx_transform_result (result_type, result_id),
  KEY idx_transform_dept (dept_id),
  KEY idx_transform_status (finish_status),
  KEY idx_transform_date (transform_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成果转化项目表';

CREATE TABLE IF NOT EXISTS transform_distribution (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  transform_id INT NOT NULL COMMENT '转化项目ID',
  inner_ratio DECIMAL(6,3) NULL COMMENT '院内比例',
  team_ratio DECIMAL(6,3) NULL COMMENT '团队比例',
  personal_ratio DECIMAL(6,3) NULL COMMENT '个人比例',
  actual_amount DECIMAL(14,2) NULL COMMENT '实际发放金额',
  voucher_attachment_id INT NULL COMMENT '分配凭证附件ID',
  record_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
  remark VARCHAR(255) NULL,
  KEY idx_transform_distribution_transform (transform_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成果转化收益分配台账';

-- ============================================================
-- 4. 附件 / 档案
-- ============================================================
CREATE TABLE IF NOT EXISTS attachment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  relation_type VARCHAR(50) NULL COMMENT 'paper/patent/copyright/transform/fee/approval',
  relation_id INT NULL COMMENT '关联业务ID',
  file_name VARCHAR(255) NOT NULL COMMENT '当前存储文件名',
  original_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
  file_size BIGINT NULL COMMENT '文件大小',
  mime_type VARCHAR(100) NULL COMMENT 'MIME类型',
  file_path VARCHAR(500) NOT NULL COMMENT '当前文件路径',
  version INT NOT NULL DEFAULT 1 COMMENT '当前版本号',
  upload_user VARCHAR(100) NULL COMMENT '上传人',
  secret_level VARCHAR(20) NOT NULL DEFAULT '公开' COMMENT '附件密级',
  storage_mode VARCHAR(30) NOT NULL DEFAULT 'local' COMMENT 'local/encrypted/oss',
  download_permission VARCHAR(100) NULL COMMENT '下载权限策略',
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_attachment_relation (relation_type, relation_id),
  KEY idx_attachment_secret (secret_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='附件主表';

CREATE TABLE IF NOT EXISTS attachment_version (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attachment_id INT NOT NULL COMMENT '附件ID',
  version INT NOT NULL COMMENT '版本号',
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NULL,
  mime_type VARCHAR(100) NULL,
  file_path VARCHAR(500) NOT NULL,
  checksum VARCHAR(128) NULL COMMENT '文件校验和',
  upload_user VARCHAR(100) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_attachment_version (attachment_id, version),
  KEY idx_attachment_version_attachment (attachment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='附件版本表';

CREATE TABLE IF NOT EXISTS attachment_access_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attachment_id INT NOT NULL,
  version_id INT NULL,
  user_id INT NULL,
  username VARCHAR(100) NULL,
  action VARCHAR(30) NOT NULL COMMENT 'preview/download/delete',
  success BOOLEAN NOT NULL DEFAULT TRUE,
  ip_address VARCHAR(50) NULL,
  error_message TEXT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_attachment_access_attachment (attachment_id),
  KEY idx_attachment_access_user (user_id),
  KEY idx_attachment_access_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='附件访问日志';

-- ============================================================
-- 5. 费用 / 缴费 / 凭证
-- ============================================================
CREATE TABLE IF NOT EXISTS fee (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  relation_type VARCHAR(20) NULL COMMENT 'patent/copyright',
  relation_id INT NULL COMMENT '关联成果ID',
  relation_name VARCHAR(255) NULL COMMENT '关联成果名称',
  fee_type VARCHAR(50) NULL COMMENT '费用类型',
  fund_source VARCHAR(50) NULL COMMENT '经费来源',
  amount DECIMAL(14,2) NULL COMMENT '金额',
  due_date VARCHAR(20) NULL COMMENT '截止缴费日',
  paid_date VARCHAR(20) NULL COMMENT '实际缴费日',
  voucher_no VARCHAR(100) NULL COMMENT '凭证编号',
  pay_status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/paid/overdue/cancelled',
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' COMMENT '缴费审批状态',
  dept_id INT NULL COMMENT '所属部门ID',
  create_user VARCHAR(100) NULL COMMENT '登记人',
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_fee_relation (relation_type, relation_id),
  KEY idx_fee_due (due_date),
  KEY idx_fee_status (pay_status),
  KEY idx_fee_dept (dept_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识产权费用台账';

CREATE TABLE IF NOT EXISTS fee_plan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fee_id INT NULL COMMENT '关联费用台账ID',
  relation_type VARCHAR(20) NULL,
  relation_id INT NULL,
  plan_year INT NULL COMMENT '计划年度',
  due_date VARCHAR(20) NOT NULL COMMENT '计划截止日',
  amount DECIMAL(14,2) NULL,
  plan_status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending/paused/generated/cancelled',
  is_auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
  dept_id INT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_fee_plan_fee (fee_id),
  KEY idx_fee_plan_relation (relation_type, relation_id),
  KEY idx_fee_plan_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='缴费计划表';

CREATE TABLE IF NOT EXISTS fee_payment_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fee_id INT NOT NULL COMMENT '费用ID',
  payment_amount DECIMAL(14,2) NOT NULL COMMENT '支付金额',
  payment_date VARCHAR(20) NOT NULL COMMENT '支付日期',
  payer VARCHAR(100) NULL COMMENT '支付人/经办人',
  finance_status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT '财务状态 pending/confirmed/rejected',
  finance_voucher_no VARCHAR(100) NULL COMMENT '财务凭证号',
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fee_payment_fee (fee_id),
  KEY idx_fee_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='缴费记录表';

CREATE TABLE IF NOT EXISTS fee_voucher (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_record_id INT NOT NULL COMMENT '缴费记录ID',
  voucher_no VARCHAR(100) NULL COMMENT '凭证号',
  attachment_id INT NULL COMMENT '凭证附件ID',
  voucher_type VARCHAR(50) NULL COMMENT '凭证类型',
  archive_status VARCHAR(30) NOT NULL DEFAULT 'archived',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fee_voucher_payment (payment_record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='缴费凭证表';

-- ============================================================
-- 6. 提醒 / 通知
-- ============================================================
CREATE TABLE IF NOT EXISTS reminder_rule (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL COMMENT '提醒事项名称',
  remind_type VARCHAR(50) NULL COMMENT '提醒类型',
  deadline VARCHAR(20) NULL COMMENT '截止日期',
  days_before INT NOT NULL DEFAULT 30 COMMENT '提前天数',
  remind_level VARCHAR(20) NOT NULL DEFAULT '普通' COMMENT '普通/重要/紧急',
  dept_id INT NULL COMMENT '责任部门',
  receiver_ids TEXT NULL COMMENT '责任人ID列表JSON',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_reminder_rule_dept (dept_id),
  KEY idx_reminder_rule_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒规则表';

CREATE TABLE IF NOT EXISTS reminder_task (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL COMMENT '提醒标题',
  target_type VARCHAR(50) NULL COMMENT 'paper/patent/copyright/transform/rule',
  target_id INT NULL COMMENT '关联ID',
  remind_date VARCHAR(20) NULL COMMENT '提醒日期',
  deadline VARCHAR(20) NULL COMMENT '事项截止日',
  remind_level VARCHAR(20) NOT NULL DEFAULT '普通',
  receiver_id INT NULL,
  receiver_name VARCHAR(100) NULL,
  dept_id INT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  is_confirm BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_time DATETIME NULL,
  second_remind_sent BOOLEAN NOT NULL DEFAULT FALSE,
  second_remind_time DATETIME NULL,
  rule_id INT NULL,
  remark TEXT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_reminder_task_receiver (receiver_id),
  KEY idx_reminder_task_dept (dept_id),
  KEY idx_reminder_task_date (remind_date),
  KEY idx_reminder_task_confirm (is_confirm),
  KEY idx_reminder_task_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒任务表';

CREATE TABLE IF NOT EXISTS notification_message (
  id INT PRIMARY KEY AUTO_INCREMENT,
  receiver_id INT NULL COMMENT '接收人ID',
  receiver_name VARCHAR(100) NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NULL,
  message_type VARCHAR(50) NOT NULL DEFAULT 'system' COMMENT 'system/reminder/approval/report',
  source_type VARCHAR(50) NULL,
  source_id INT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_time DATETIME NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notification_receiver (receiver_id, is_read),
  KEY idx_notification_source (source_type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站内消息表';

CREATE TABLE IF NOT EXISTS notification_send_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NULL,
  channel VARCHAR(30) NOT NULL COMMENT 'email/sms/site',
  receiver VARCHAR(200) NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  provider VARCHAR(100) NULL,
  error_message TEXT NULL,
  send_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notification_send_message (message_id),
  KEY idx_notification_send_channel (channel),
  KEY idx_notification_send_time (send_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送日志';

-- ============================================================
-- 7. 审批流程
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_flow (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_code VARCHAR(100) NOT NULL COMMENT '流程编码',
  flow_name VARCHAR(100) NOT NULL COMMENT '流程名称',
  business_type VARCHAR(50) NOT NULL COMMENT 'paper/patent/copyright/transform/fee/secret',
  secret_level VARCHAR(20) NULL COMMENT '适用密级',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  remark VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_approval_flow_code (flow_code),
  KEY idx_approval_flow_business (business_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流程定义表';

CREATE TABLE IF NOT EXISTS approval_flow_node (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程ID',
  node_code VARCHAR(100) NOT NULL COMMENT '节点编码',
  node_name VARCHAR(100) NOT NULL COMMENT '节点名称',
  node_order INT NOT NULL DEFAULT 1 COMMENT '节点顺序',
  approver_role VARCHAR(100) NULL COMMENT '审批角色',
  approver_user_id INT NULL COMMENT '指定审批人',
  approve_mode VARCHAR(30) NOT NULL DEFAULT 'single' COMMENT 'single/countersign/orsign',
  allow_reject BOOLEAN NOT NULL DEFAULT TRUE,
  allow_add_sign BOOLEAN NOT NULL DEFAULT FALSE,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_approval_flow_node (flow_id, node_code),
  KEY idx_approval_flow_node_flow (flow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流程节点定义表';

CREATE TABLE IF NOT EXISTS approval_instance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程ID',
  business_type VARCHAR(50) NOT NULL,
  business_id INT NOT NULL,
  title VARCHAR(200) NOT NULL COMMENT '审批标题',
  submit_user_id INT NULL,
  submit_username VARCHAR(100) NULL,
  dept_id INT NULL,
  current_node_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected/cancelled/archived',
  submit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finish_time DATETIME NULL,
  remark VARCHAR(255) NULL,
  KEY idx_approval_instance_business (business_type, business_id),
  KEY idx_approval_instance_status (status),
  KEY idx_approval_instance_dept (dept_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批实例表';

CREATE TABLE IF NOT EXISTS approval_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL COMMENT '审批实例ID',
  node_id INT NULL COMMENT '节点ID',
  action VARCHAR(30) NOT NULL COMMENT 'submit/approve/reject/return/add_sign/archive/cancel',
  opinion TEXT NULL COMMENT '审批意见',
  operator_id INT NULL,
  operator_name VARCHAR(100) NULL,
  operate_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_node_id INT NULL,
  attachment_id INT NULL,
  KEY idx_approval_record_instance (instance_id),
  KEY idx_approval_record_operator (operator_id),
  KEY idx_approval_record_time (operate_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批记录表';

-- ============================================================
-- 8. 审计 / 搜索 / 报表
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  username VARCHAR(100) NULL COMMENT '操作人用户名',
  real_name VARCHAR(100) NULL COMMENT '操作人真名',
  method VARCHAR(20) NULL COMMENT 'HTTP方法',
  path VARCHAR(255) NULL COMMENT '请求路径',
  module VARCHAR(50) NULL COMMENT '业务模块',
  action VARCHAR(50) NULL COMMENT '操作动作',
  body TEXT NULL COMMENT '请求体脱敏',
  status_code INT NULL COMMENT '响应状态码',
  ip VARCHAR(50) NULL COMMENT '客户端IP',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user (user_id),
  KEY idx_audit_module_action (module, action),
  KEY idx_audit_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作审计日志';

CREATE TABLE IF NOT EXISTS search_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword VARCHAR(255) NOT NULL COMMENT '搜索关键词',
  types VARCHAR(255) NULL COMMENT '搜索类型 paper,patent,...',
  result_count INT NOT NULL DEFAULT 0,
  elapsed_ms DECIMAL(12,3) NULL,
  engine VARCHAR(50) NOT NULL DEFAULT 'rust',
  user_id INT NULL,
  username VARCHAR(100) NULL,
  dept_id INT NULL,
  ip VARCHAR(50) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_search_log_keyword (keyword),
  KEY idx_search_log_user (user_id),
  KEY idx_search_log_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='检索日志表';

CREATE TABLE IF NOT EXISTS report_template (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL COMMENT 'paper/patent/fee/transform/custom',
  config_json TEXT NULL COMMENT '报表配置JSON',
  scope VARCHAR(50) NOT NULL DEFAULT 'dept' COMMENT 'personal/dept/all',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  create_user VARCHAR(100) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_report_template_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报表模板表';

CREATE TABLE IF NOT EXISTS report_export_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NULL,
  report_type VARCHAR(50) NOT NULL,
  export_format VARCHAR(20) NOT NULL COMMENT 'xlsx/pdf/csv',
  file_path VARCHAR(500) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending/success/failed',
  error_message TEXT NULL,
  user_id INT NULL,
  username VARCHAR(100) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finish_time DATETIME NULL,
  KEY idx_report_export_user (user_id),
  KEY idx_report_export_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报表导出日志';

CREATE TABLE IF NOT EXISTS scheduled_report_task (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  task_name VARCHAR(100) NOT NULL,
  cron_expr VARCHAR(100) NOT NULL COMMENT '定时表达式',
  receivers TEXT NULL COMMENT '接收人JSON',
  channel VARCHAR(50) NOT NULL DEFAULT 'email' COMMENT 'site/email',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_time DATETIME NULL,
  next_run_time DATETIME NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_scheduled_report_template (template_id),
  KEY idx_scheduled_report_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时报表任务';

-- ============================================================
-- 9. 外部接口 / 涉密 / 运维
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('crossref','scopus','openalex','cnipa','hr_ldap','finance','email','sms') NOT NULL COMMENT '接口类型',
  name VARCHAR(100) NOT NULL COMMENT '显示名称',
  base_url VARCHAR(500) NULL COMMENT '接口基础地址',
  api_key_env VARCHAR(100) NULL COMMENT 'API Key环境变量名',
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  timeout_ms INT NOT NULL DEFAULT 8000,
  retry_count INT NOT NULL DEFAULT 3,
  fallback_mode VARCHAR(50) NOT NULL DEFAULT 'manual',
  extra TEXT NULL COMMENT 'JSON扩展配置',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_integration_config_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外部接口配置中心';

CREATE TABLE IF NOT EXISTS integration_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('crossref','scopus','openalex','cnipa','hr_ldap','finance','email','sms') NOT NULL,
  action VARCHAR(100) NOT NULL,
  request_url VARCHAR(800) NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  status_code INT NULL,
  elapsed_ms INT NULL,
  error_message TEXT NULL,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT NULL COMMENT 'JSON摘要，不能存敏感密钥',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_integration_log_type (type),
  KEY idx_integration_log_success (success),
  KEY idx_integration_log_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接口调用日志';

CREATE TABLE IF NOT EXISTS integration_mapping (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_type VARCHAR(50) NOT NULL,
  business_module VARCHAR(50) NOT NULL COMMENT 'paper/patent/user/fee',
  external_field VARCHAR(100) NOT NULL,
  internal_field VARCHAR(100) NOT NULL,
  transform_rule TEXT NULL COMMENT '字段转换规则',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_integration_mapping_type (integration_type),
  KEY idx_integration_mapping_module (business_module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外部接口字段映射';

CREATE TABLE IF NOT EXISTS integration_alert (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_type VARCHAR(50) NOT NULL,
  alert_level VARCHAR(20) NOT NULL DEFAULT 'warning' COMMENT 'info/warning/critical',
  title VARCHAR(200) NOT NULL,
  content TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open' COMMENT 'open/handled/ignored',
  handler_id INT NULL,
  handler_name VARCHAR(100) NULL,
  handled_time DATETIME NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_integration_alert_type (integration_type),
  KEY idx_integration_alert_status (status),
  KEY idx_integration_alert_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接口异常告警';

CREATE TABLE IF NOT EXISTS secret_access_grant (
  id INT PRIMARY KEY AUTO_INCREMENT,
  business_type VARCHAR(50) NOT NULL COMMENT 'paper/patent/copyright/attachment',
  business_id INT NOT NULL,
  grant_user_id INT NOT NULL COMMENT '被授权用户ID',
  grant_username VARCHAR(100) NULL,
  grant_scope VARCHAR(50) NOT NULL DEFAULT 'read' COMMENT 'read/download/manage',
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  grant_reason VARCHAR(255) NULL,
  granted_by INT NULL,
  granted_by_name VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_secret_grant_business (business_type, business_id),
  KEY idx_secret_grant_user (grant_user_id),
  KEY idx_secret_grant_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='涉密访问授权';

CREATE TABLE IF NOT EXISTS secret_access_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  grant_id INT NULL,
  business_type VARCHAR(50) NOT NULL,
  business_id INT NOT NULL,
  user_id INT NULL,
  username VARCHAR(100) NULL,
  action VARCHAR(50) NOT NULL COMMENT 'view/download/preview/export',
  success BOOLEAN NOT NULL DEFAULT TRUE,
  ip VARCHAR(50) NULL,
  reason VARCHAR(255) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_secret_log_business (business_type, business_id),
  KEY idx_secret_log_user (user_id),
  KEY idx_secret_log_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='涉密访问日志';

CREATE TABLE IF NOT EXISTS backup_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  backup_type VARCHAR(30) NOT NULL COMMENT 'auto/manual',
  file_path VARCHAR(500) NULL,
  file_size BIGINT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending/success/failed/restored',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  operator_id INT NULL,
  operator_name VARCHAR(100) NULL,
  error_message TEXT NULL,
  remark VARCHAR(255) NULL,
  KEY idx_backup_log_status (status),
  KEY idx_backup_log_time (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库备份恢复日志';

SET FOREIGN_KEY_CHECKS = 1;
