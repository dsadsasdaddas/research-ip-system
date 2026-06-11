-- 数据字典默认类型和字典项，幂等插入。

INSERT INTO dictionary_type (code, name, scope, is_system, is_active, remark) VALUES
('secret_level', '密级', 'security', TRUE, TRUE, '成果和附件密级'),
('paper_status', '论文状态', 'business', TRUE, TRUE, '论文成果状态'),
('paper_included_type', '论文收录类型', 'business', TRUE, TRUE, 'SCI/EI/CSCD 等'),
('paper_partition', '中科院分区', 'business', TRUE, TRUE, '论文分区'),
('patent_type', '专利类型', 'business', TRUE, TRUE, '发明/实用新型/外观设计/PCT'),
('patent_legal_status', '专利法律状态', 'business', TRUE, TRUE, '申请中/授权/失效/驳回'),
('patent_mark', '专利标识', 'security', TRUE, TRUE, '普通专利/国防专利/涉密专利'),
('fee_type', '费用类型', 'business', TRUE, TRUE, '申请费/年费/代理费等'),
('fee_status', '费用状态', 'business', TRUE, TRUE, '待缴费/已缴费/已逾期/已取消'),
('remind_level', '提醒等级', 'business', TRUE, TRUE, '普通/重要/紧急'),
('transform_type', '转化类型', 'business', TRUE, TRUE, '技术转让/许可/作价入股'),
('transform_status', '转化节点', 'business', TRUE, TRUE, '合同签订/收款/开票/完成等'),
('result_type', '成果类型', 'business', TRUE, TRUE, '论文/专利/软著/转化')
ON DUPLICATE KEY UPDATE name = VALUES(name), scope = VALUES(scope), is_system = VALUES(is_system), is_active = VALUES(is_active), remark = VALUES(remark);

INSERT INTO dictionary_item (type_code, label, value, sort_order, color, is_default, is_system, is_active) VALUES
('secret_level', '公开', '公开', 1, 'info', TRUE, TRUE, TRUE),
('secret_level', '内部', '内部', 2, 'warning', FALSE, TRUE, TRUE),
('secret_level', '涉密', '涉密', 3, 'danger', FALSE, TRUE, TRUE),

('paper_status', '在线发表', '在线发表', 1, 'success', TRUE, TRUE, TRUE),
('paper_status', '正式出版', '正式出版', 2, 'primary', FALSE, TRUE, TRUE),

('paper_included_type', 'SCI', 'SCI', 1, 'success', FALSE, TRUE, TRUE),
('paper_included_type', 'EI', 'EI', 2, 'success', FALSE, TRUE, TRUE),
('paper_included_type', 'CSCD', 'CSCD', 3, 'info', FALSE, TRUE, TRUE),
('paper_included_type', 'CSSCI', 'CSSCI', 4, 'info', FALSE, TRUE, TRUE),
('paper_included_type', '中文核心', '中文核心', 5, 'info', FALSE, TRUE, TRUE),
('paper_included_type', '其他', '其他', 99, 'info', TRUE, TRUE, TRUE),

('paper_partition', '一区', '一区', 1, 'success', FALSE, TRUE, TRUE),
('paper_partition', '二区', '二区', 2, 'primary', FALSE, TRUE, TRUE),
('paper_partition', '三区', '三区', 3, 'warning', FALSE, TRUE, TRUE),
('paper_partition', '四区', '四区', 4, 'info', FALSE, TRUE, TRUE),

('patent_type', '发明', '发明', 1, 'success', TRUE, TRUE, TRUE),
('patent_type', '实用新型', '实用新型', 2, 'primary', FALSE, TRUE, TRUE),
('patent_type', '外观设计', '外观设计', 3, 'info', FALSE, TRUE, TRUE),
('patent_type', 'PCT', 'PCT', 4, 'warning', FALSE, TRUE, TRUE),

('patent_legal_status', '申请中', '申请中', 1, 'warning', TRUE, TRUE, TRUE),
('patent_legal_status', '授权', '授权', 2, 'success', FALSE, TRUE, TRUE),
('patent_legal_status', '失效', '失效', 3, 'danger', FALSE, TRUE, TRUE),
('patent_legal_status', '驳回', '驳回', 4, 'danger', FALSE, TRUE, TRUE),

('patent_mark', '普通专利', '普通专利', 1, 'info', TRUE, TRUE, TRUE),
('patent_mark', '国防专利', '国防专利', 2, 'warning', FALSE, TRUE, TRUE),
('patent_mark', '涉密专利', '涉密专利', 3, 'danger', FALSE, TRUE, TRUE),

('fee_type', '申请费', '申请费', 1, 'info', FALSE, TRUE, TRUE),
('fee_type', '年费', '年费', 2, 'warning', TRUE, TRUE, TRUE),
('fee_type', '代理费', '代理费', 3, 'info', FALSE, TRUE, TRUE),
('fee_type', '维持费', '维持费', 4, 'info', FALSE, TRUE, TRUE),
('fee_type', '复审费', '复审费', 5, 'info', FALSE, TRUE, TRUE),

('fee_status', '待缴费', 'pending', 1, 'warning', TRUE, TRUE, TRUE),
('fee_status', '已缴费', 'paid', 2, 'success', FALSE, TRUE, TRUE),
('fee_status', '已逾期', 'overdue', 3, 'danger', FALSE, TRUE, TRUE),
('fee_status', '已取消', 'cancelled', 4, 'info', FALSE, TRUE, TRUE),

('remind_level', '普通', '普通', 1, 'info', TRUE, TRUE, TRUE),
('remind_level', '重要', '重要', 2, 'warning', FALSE, TRUE, TRUE),
('remind_level', '紧急', '紧急', 3, 'danger', FALSE, TRUE, TRUE),

('transform_type', '技术转让', '技术转让', 1, 'primary', FALSE, TRUE, TRUE),
('transform_type', '独占许可', '独占许可', 2, 'success', FALSE, TRUE, TRUE),
('transform_type', '排他许可', '排他许可', 3, 'success', FALSE, TRUE, TRUE),
('transform_type', '普通许可', '普通许可', 4, 'info', TRUE, TRUE, TRUE),
('transform_type', '作价入股', '作价入股', 5, 'warning', FALSE, TRUE, TRUE),

('transform_status', '合同签订', '合同签订', 1, 'primary', TRUE, TRUE, TRUE),
('transform_status', '收款', '收款', 2, 'warning', FALSE, TRUE, TRUE),
('transform_status', '开票', '开票', 3, 'warning', FALSE, TRUE, TRUE),
('transform_status', '完成', '完成', 4, 'success', FALSE, TRUE, TRUE),
('transform_status', '合同中止', '合同中止', 5, 'danger', FALSE, TRUE, TRUE),
('transform_status', '转化失败', '转化失败', 6, 'danger', FALSE, TRUE, TRUE),
('transform_status', '合同作废', '合同作废', 7, 'danger', FALSE, TRUE, TRUE),

('result_type', '论文', 'paper', 1, 'primary', FALSE, TRUE, TRUE),
('result_type', '专利', 'patent', 2, 'success', FALSE, TRUE, TRUE),
('result_type', '软著', 'copyright', 3, 'warning', FALSE, TRUE, TRUE),
('result_type', '成果转化', 'transform', 4, 'info', FALSE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order), color = VALUES(color), is_default = VALUES(is_default), is_system = VALUES(is_system), is_active = VALUES(is_active);
