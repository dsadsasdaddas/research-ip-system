-- 科研成果与知识产权管理系统正式默认数据
SET NAMES utf8mb4;

-- 默认部门
INSERT INTO department (id, name, parent_id, description) VALUES
(1, '计算机研究所', NULL, '示例部门'),
(2, '电子工程研究所', NULL, '示例部门')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- 默认用户：admin 密码 Admin@123；其他测试账号密码 Test@123
INSERT INTO `user` (id, username, password, real_name, email, role, dept_id, is_active) VALUES
(1, 'admin', '$2b$10$Dt3uFqzzwva2xbvC4arfUuhi7jSHhdCCAKcxO8pL9nXut92RJ.9LO', '系统管理员', NULL, 'sys_admin', NULL, TRUE),
(2, 'leader', '$2b$10$q2/RPdt.vVwyjjGcX8LwOOIuNAUoc6SDEmkus1cqyEJlb5oVwq8oG', '院领导', NULL, 'leader', NULL, TRUE),
(3, 'auditor', '$2b$10$q2/RPdt.vVwyjjGcX8LwOOIuNAUoc6SDEmkus1cqyEJlb5oVwq8oG', '审计员', NULL, 'auditor', NULL, TRUE),
(4, 'secret', '$2b$10$q2/RPdt.vVwyjjGcX8LwOOIuNAUoc6SDEmkus1cqyEJlb5oVwq8oG', '涉密管理员', NULL, 'secret_admin', NULL, TRUE),
(5, 'cs_admin', '$2b$10$q2/RPdt.vVwyjjGcX8LwOOIuNAUoc6SDEmkus1cqyEJlb5oVwq8oG', '计算机所管理员', NULL, 'dept_admin', 1, TRUE),
(6, 'cs_sec', '$2b$10$q2/RPdt.vVwyjjGcX8LwOOIuNAUoc6SDEmkus1cqyEJlb5oVwq8oG', '计算机所秘书', NULL, 'dept_secretary', 1, TRUE),
(7, 'cs_user', '$2b$10$q2/RPdt.vVwyjjGcX8LwOOIuNAUoc6SDEmkus1cqyEJlb5oVwq8oG', '计算机所科研', NULL, 'researcher', 1, TRUE),
(8, 'ee_user', '$2b$10$q2/RPdt.vVwyjjGcX8LwOOIuNAUoc6SDEmkus1cqyEJlb5oVwq8oG', '电子所科研', NULL, 'researcher', 2, TRUE)
ON DUPLICATE KEY UPDATE real_name = VALUES(real_name), role = VALUES(role), dept_id = VALUES(dept_id), is_active = VALUES(is_active);

-- RBAC 基础角色
INSERT INTO rbac_role (code, name, data_scope, is_system, is_active, remark) VALUES
('researcher', '科研人员', 'self', TRUE, TRUE, '仅本人/本部门基础数据'),
('dept_secretary', '部门秘书', 'dept', TRUE, TRUE, '本部门审核与管理'),
('dept_admin', '部门管理员', 'dept', TRUE, TRUE, '本部门基础配置'),
('leader', '院领导', 'all', TRUE, TRUE, '全院统计查看'),
('secret_admin', '涉密管理员', 'all', TRUE, TRUE, '涉密成果专项管理'),
('auditor', '审计员', 'all', TRUE, TRUE, '全院只读审计'),
('sys_admin', '系统管理员', 'all', TRUE, TRUE, '系统最高配置权限')
ON DUPLICATE KEY UPDATE name = VALUES(name), data_scope = VALUES(data_scope), is_system = VALUES(is_system), is_active = VALUES(is_active), remark = VALUES(remark);

-- 外部接口默认配置
INSERT INTO integration_config (type, name, base_url, api_key_env, is_enabled, timeout_ms, retry_count, fallback_mode, extra) VALUES
('crossref', 'Crossref DOI 查询', 'https://api.crossref.org', NULL, TRUE, 8000, 3, 'manual', NULL),
('scopus', 'Scopus 论文数据', NULL, 'SCOPUS_API_KEY', FALSE, 8000, 3, 'manual', NULL),
('openalex', 'OpenAlex 论文数据', 'https://api.openalex.org', NULL, FALSE, 8000, 3, 'manual', NULL),
('cnipa', 'CNIPA 专利状态同步', NULL, 'CNIPA_API_KEY', FALSE, 10000, 3, 'manual', NULL),
('hr_ldap', 'HR/LDAP 人员部门同步', NULL, 'LDAP_BIND_PASSWORD', FALSE, 8000, 3, 'manual', NULL),
('finance', '财务系统凭证/对账', NULL, 'FINANCE_API_KEY', FALSE, 10000, 3, 'manual', NULL),
('email', '邮件通知', NULL, 'SMTP_PASS', FALSE, 8000, 3, 'manual', NULL),
('sms', '短信通知', NULL, 'SMS_API_KEY', FALSE, 8000, 3, 'manual', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name), base_url = VALUES(base_url), api_key_env = VALUES(api_key_env), timeout_ms = VALUES(timeout_ms), retry_count = VALUES(retry_count), fallback_mode = VALUES(fallback_mode);

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

-- ============================================================
-- 演示业务数据(论文/专利/软著/转化)
-- 幂等:仅当对应表里还没有 create_user 为 cs_user/ee_user 的演示行时才插入,
--      因此 schema.sql + seed.sql 重复执行不会产生重复数据,也不依赖固定 ID
--      (业务表主键自增,与现有结构数据 admin/dept1-2 等不冲突)。
-- 列名均取自 database/schema.sql 原始定义(论文用 cas_partition 而非 partition)。
-- ============================================================

-- ---- 论文 ~30 篇(cs_user=计算机所 dept1,ee_user=电子所 dept2)----
INSERT INTO paper (
  title, doi, first_author, corresponding_author, authors, outer_authors, cooperate_unit,
  journal, issn_cn, volume_page, publish_year, impact_factor, citation_count, included_type,
  cas_partition, status, abstract, secret_level, depend_project, approval_status, archive_status,
  dept_id, create_user
)
SELECT * FROM (
  SELECT '基于深度学习的图像目标检测综述' AS title, '10.1109/TPAMI.2022.1111111' AS doi, '张伟' AS first_author, '张伟' AS corresponding_author, '张伟,李娜,王强' AS authors, 'John Smith' AS outer_authors, '清华大学计算机系' AS cooperate_unit, 'IEEE Trans. on Pattern Analysis' AS journal, 'ISSN 0162-8828' AS issn_cn, 'vol.44 no.3 pp.201-220' AS volume_page, 2022 AS publish_year, 24.314 AS impact_factor, 156 AS citation_count, 'SCI' AS included_type, '一区' AS cas_partition, '正式出版' AS status, '本文综述了基于深度学习的目标检测方法进展...' AS abstract, '公开' AS secret_level, '国家自然科学基金面上项目' AS depend_project, 'approved' AS approval_status, 'normal' AS archive_status, 1 AS dept_id, 'cs_user' AS create_user
  UNION ALL SELECT '面向边缘计算的轻量化神经网络设计','10.1109/TMC.2022.2222222','李娜','李娜','李娜,张伟','Alice Brown','中科院计算所','IEEE Trans. on Mobile Computing','ISSN 1536-1233','vol.21 no.6 pp.55-72',2022,7.123,42,'SCI','二区','正式出版','提出一种面向边缘设备的轻量化网络结构...','公开','重点研发计划','approved','normal',1,'cs_user'
  UNION ALL SELECT '图神经网络在知识图谱推理中的应用','10.1109/TKDE.2023.3333333','王强','王强','王强,张伟','Bob Lee','北京大学信息学院','IEEE Trans. on Knowledge and Data Engineering','ISSN 1041-4347','vol.35 no.4 pp.1024-1040',2023,8.912,67,'SCI','一区','正式出版','研究图神经网络在知识图谱推理任务上的效果...','公开','国家自然科学基金青年项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '联邦学习隐私保护机制研究','10.1016/j.ins.2023.4444444','赵敏','赵敏','赵敏,李娜','Carol White','复旦大学','Information Sciences','ISSN 0020-0255','vol.621 pp.310-328',2023,8.100,53,'SCI','二区','正式出版','本文提出一种新型联邦学习隐私保护机制...','内部','国家自然科学基金面上项目','approved','normal',1,'cs_user'
  UNION ALL SELECT 'Transformer在中文文本分类中的对比实验','10.1109/TCSS.2023.5555555','陈杰','陈杰','陈杰,王强',NULL,'浙江大学','IEEE Trans. on Computational Social Systems','ISSN 2329-924X','vol.10 no.2 pp.340-352',2023,4.512,28,'SCI','三区','正式出版','系统对比了多种Transformer变体在中文文本分类上的表现...','公开','校自主课题','approved','normal',1,'cs_user'
  UNION ALL SELECT '基于强化学习的推荐系统冷启动优化','10.1145/3534678.3539201','孙莉','孙莉','孙莉,赵敏','David Chen','上海交通大学','Proc. of the 44th SIGIR','ISBN 978-1-4503-8532-8','pp.451-460',2022,5.000,19,'EI',NULL,'正式出版','针对推荐系统冷启动问题提出基于强化学习的方法...','公开','横向课题','approved','normal',1,'cs_user'
  UNION ALL SELECT '面向大规模图数据的分布式查询引擎','10.1109/TPDS.2024.6666666','周涛','周涛','周涛,陈杰','Eve Wang','华为技术有限公司','IEEE Trans. on Parallel and Distributed Systems','ISSN 1045-9219','vol.35 no.1 pp.88-103',2024,3.557,12,'SCI','三区','正式出版','提出一种可扩展的分布式图查询引擎架构...','公开','国家重点研发计划','approved','normal',1,'cs_user'
  UNION ALL SELECT '跨模态检索中注意力机制的改进','10.1016/j.neunet.2024.7777777','吴芳','吴芳','吴芳,孙莉','Frank Liu','南京大学','Neural Networks','ISSN 0893-6080','vol.175 pp.252-265',2024,7.800,35,'SCI','二区','在线发表','改进了跨模态检索中的注意力机制...','公开','国家自然科学基金面上项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种面向时序数据的异常检测算法','10.1109/TII.2024.8888888','郑宇','郑宇','郑宇,周涛',NULL,'东南大学','IEEE Trans. on Industrial Informatics','ISSN 1551-3203','vol.20 no.5 pp.6700-6712',2024,11.700,41,'SCI','一区','在线发表','提出针对工业时序数据的异常检测算法...','内部','产学研合作项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '基于对比学习的少样本图像分类','10.1109/TIP.2025.9999999','黄敏','黄敏','黄敏,吴芳','Grace Hall','华中科技大学','IEEE Trans. on Image Processing','ISSN 1057-7149','vol.34 pp.1200-1215',2025,11.800,8,'SCI','一区','在线发表','研究对比学习在小样本图像分类中的应用...','公开','国家自然科学基金青年项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '面向云原生的服务网格流量调度策略','10.1109/TSC.2025.1010101','林峰','林峰','林峰,郑宇','Henry Adams','阿里云','IEEE Trans. on Services Computing','ISSN 1939-1374','vol.18 no.2 pp.770-784',2025,5.800,5,'SCI','二区','在线发表','提出云原生环境下服务网格的流量调度策略...','公开','重点研发计划','approved','normal',1,'cs_user'
  UNION ALL SELECT '自然语言推理中的可解释性研究','10.1162/tacl_a_00600','徐磊','徐磊','徐磊,黄敏','Ivy King','中国人民大学','Transactions of the ACL','ISSN 2307-387X','vol.13 pp.310-326',2025,4.200,3,'SCI','三区','在线发表','探讨自然语言推理模型的可解释性...','公开','校自主课题','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种高效的语义分割网络结构搜索方法','10.1109/TPAMI.2026.1212121','何静','何静','何静,徐磊','Jack Wilson','北京航空航天大学','IEEE Trans. on Pattern Analysis','ISSN 0162-8828','vol.48 no.1 pp.95-110',2026,24.314,1,'SCI','一区','在线发表','提出高效的语义分割 NAS 方法...','公开','国家自然科学基金面上项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '低资源场景下的预训练语言模型微调','10.18653/v1/2026.nlp-1.10','郭强','郭强','郭强,何静',NULL,'天津大学','Proc. of NAACL-HLT','ISBN 978-1-959429-12-3','pp.120-135',2026,3.500,0,'EI',NULL,'在线发表','研究低资源场景下预训练模型的微调策略...','公开','横向课题','approved','normal',1,'cs_user'
  UNION ALL SELECT '基于知识蒸馏的端侧模型压缩','10.1109/ETFA.2022.1313131','杨光','杨光','杨光,郭强','Leo Martin','西安交通大学','Proc. of ETFA','ISBN 978-1-6654-9876-1','pp.1-8',2022,2.100,9,'EI',NULL,'正式出版','提出基于知识蒸馏的端侧模型压缩方案...','公开','产学研合作项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种面向视频理解的时空特征融合网络','10.1109/CVPR.2023.1414141','许婷','许婷','许婷,杨光','Mia Davis','武汉大学','Proc. of CVPR','ISBN 978-1-6654-9518-6','pp.2310-2320',2023,5.000,22,'EI',NULL,'正式出版','提出时空特征融合的视频理解网络...','公开','国家自然科学基金青年项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '中文开源知识图谱构建实践','10.3724/SP.J.1016.2023.01101','丁宁','丁宁','丁宁,许婷',NULL,'哈尔滨工业大学','计算机学报','CN 11-1826/TP','vol.46 no.11 pp.2301-2318',2023,3.200,15,'中文核心',NULL,'正式出版','介绍中文开源知识图谱的构建流程与实践...','公开','国家重点研发计划','approved','normal',1,'cs_user'
  UNION ALL SELECT '面向隐私计算的安全多方学习框架','10.1145/3626246.3653388','谢军','谢军','谢军,丁宁','Nina Clark','中山大学','Proc. of SIGMOD','ISBN 979-8-4007-0354-8','pp.1421-1434',2024,2.900,4,'EI',NULL,'正式出版','提出一种面向隐私计算的安全多方学习框架...','内部','国家自然科学基金面上项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '低代码平台的可视化编排引擎设计','10.1109/ICSE.2024.00151','宋佳','宋佳','宋佳,谢军',NULL,'大连理工大学','Proc. of ICSE','ISBN 979-8-3503-0329-4','pp.234-245',2024,3.100,6,'CSCD',NULL,'正式出版','设计低代码平台的可视化编排引擎...','公开','横向课题','approved','normal',1,'cs_user'
  UNION ALL SELECT '基于多智能体的交通信号优化','10.1109/TITS.2024.1616161','曹宇','曹宇','曹宇,宋佳','Oscar Bell','同济大学','IEEE Trans. on Intelligent Transportation Systems','ISSN 1524-9050','vol.25 no.7 pp.6701-6714',2024,7.900,11,'SCI','二区','在线发表','提出基于多智能体的交通信号优化方法...','公开','产学研合作项目','approved','normal',1,'cs_user'
  UNION ALL SELECT '可解释机器学习在医疗诊断中的应用','10.1016/j.artmed.2025.1717171','袁媛','袁媛','袁媛,曹宇','Paula Fisher','首都医科大学','Artificial Intelligence in Medicine','ISSN 0933-3657','vol.157 pp.102837',2025,7.500,2,'SCI','二区','在线发表','研究可解释机器学习在医疗诊断中的应用...','涉密','国家重点研发计划','approved','normal',1,'cs_user'

  UNION ALL SELECT '毫米波MIMO系统的混合预编码算法','10.1109/JSAC.2022.1818181','刘洋','刘洋','刘洋,马超','Kevin Ross','电子科技大学通信学院','IEEE J. on Selected Areas in Communications','ISSN 0733-8716','vol.40 no.6 pp.1700-1715',2022,16.600,98,'SCI','一区','正式出版','提出毫米波MIMO系统的混合预编码算法...','公开','国家自然科学基金面上项目','approved','normal',2,'ee_user'
  UNION ALL SELECT '面向6G的智能反射面信道估计','10.1109/TWC.2023.1919191','马超','马超','马超,刘洋','Linda Park','西安电子科技大学','IEEE Trans. on Wireless Communications','ISSN 1536-1276','vol.22 no.5 pp.3012-3026',2023,10.400,76,'SCI','一区','正式出版','研究面向6G的智能反射面信道估计技术...','公开','重点研发计划','approved','normal',2,'ee_user'
  UNION ALL SELECT '基于FPGA的低延迟信号处理平台','10.1109/TSP.2023.2020202','高远','高远','高远,马超','Ryan Wood','北京理工大学','IEEE Trans. on Signal Processing','ISSN 1053-587X','vol.71 pp.2840-2853',2023,4.600,29,'SCI','三区','正式出版','设计基于FPGA的低延迟信号处理平台...','内部','产学研合作项目','approved','normal',2,'ee_user'
  UNION ALL SELECT '太赫兹通信中的波束赋形优化','10.1109/TCOMM.2024.2121212','罗静','罗静','罗静,高远','Anna Diaz','哈尔滨工业大学(深圳)','IEEE Trans. on Communications','ISSN 0090-6778','vol.72 no.3 pp.1540-1553',2024,8.300,18,'SCI','二区','在线发表','研究太赫兹通信中的波束赋形优化...','公开','国家自然科学基金青年项目','approved','normal',2,'ee_user'
  UNION ALL SELECT '面向物联网的能效优先资源分配','10.1109/IOTJ.2024.2222222','邓飞','邓飞','邓飞,罗静','Sam Carter','南京邮电大学','IEEE Internet of Things Journal','ISSN 2327-4662','vol.11 no.8 pp.13401-13414',2024,10.600,33,'SCI','一区','在线发表','提出面向物联网的能效优先资源分配方案...','公开','国家重点研发计划','approved','normal',2,'ee_user'
  UNION ALL SELECT '基于深度展开网络的信道解码','10.1016/j.dsp.2025.2323232','秦岭','秦岭','秦岭,邓飞','Emma Hughes','重庆大学','Digital Signal Processing','ISSN 1051-2004','vol.147 pp.104391',2025,5.100,4,'SCI','二区','在线发表','提出基于深度展开网络的信道解码方法...','公开','校自主课题','approved','normal',2,'ee_user'
  UNION ALL SELECT '一种面向雷达目标识别的轻量网络','10.1109/TAES.2025.2424242','方芳','方芳','方芳,秦岭','Brian Reed','国防科技大学','IEEE Trans. on Aerospace and Electronic Systems','ISSN 0018-9251','vol.61 no.2 pp.1900-1913',2025,5.100,1,'SCI','二区','在线发表','提出面向雷达目标识别的轻量网络...','涉密','国防基础科研计划','approved','normal',2,'ee_user'
  UNION ALL SELECT '低轨卫星通信的波束切换算法','10.1109/TGCN.2026.2525252','冯博','冯博','冯博,方芳','Chloe Bell','中国空间技术研究院','IEEE Trans. on Green Communications and Networking','ISSN 2473-2400','vol.10 no.1 pp.55-68',2026,4.700,0,'SCI','三区','在线发表','研究低轨卫星通信的波束切换算法...','内部','重点研发计划','approved','normal',2,'ee_user'
  UNION ALL SELECT '基于RIS辅助的定位方法研究','10.1109/ACCESS.2026.2626262','韩雪','韩雪','韩雪,冯博',NULL,'西南交通大学','IEEE Access','ISSN 2169-3536','vol.14 pp.12300-12312',2026,3.900,0,'SCI','三区','在线发表','研究RIS辅助下的定位方法...','公开','国家自然科学基金青年项目','approved','normal',2,'ee_user'
  UNION ALL SELECT '电力线通信中的噪声建模与抑制','10.1109/TSG.2026.2727272','石磊','石磊','石磊,韩雪','Grace Long','华北电力大学','IEEE Trans. on Smart Grid','ISSN 1949-3053','vol.17 no.2 pp.980-992',2026,9.600,0,'SCI','一区','在线发表','研究电力线通信中的噪声建模与抑制...','公开','产学研合作项目','approved','normal',2,'ee_user'
) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM paper WHERE create_user IN ('cs_user','ee_user')
);

-- ---- 专利 ~15 项 ----
INSERT INTO patent (
  name, inventors, outer_inventors, patentee, application_no, grant_no, filing_date, grant_date,
  patent_type, country, agency, legal_status, patent_mark, depend_project, fund_source,
  secret_level, approval_status, archive_status, dept_id, create_user
)
SELECT * FROM (
  SELECT '一种基于深度学习的图像目标检测方法及系统' AS name, '张伟;李娜' AS inventors, NULL AS outer_inventors, '计算机研究所' AS patentee, '2022100111111' AS application_no, 'ZL2022100111111' AS grant_no, '2022-03-15' AS filing_date, '2024-06-20' AS grant_date, '发明' AS patent_type, '中国' AS country, '北京专利代理事务所' AS agency, '授权' AS legal_status, '普通专利' AS patent_mark, '国家自然科学基金面上项目' AS depend_project, '纵向' AS fund_source, '公开' AS secret_level, 'approved' AS approval_status, 'normal' AS archive_status, 1 AS dept_id, 'cs_user' AS create_user
  UNION ALL SELECT '一种联邦学习隐私保护装置','王强;赵敏',NULL,'计算机研究所','2022110222222','ZL2022110222222','2022-08-10','2024-09-05','发明','中国','北京专利代理事务所','授权','普通专利','国家自然科学基金青年项目','纵向','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '面向边缘设备的轻量化神经网络推理框架','李娜;张伟','John Smith','计算机研究所','2023100333333',NULL,'2023-01-20',NULL,'发明','中国','上海知识产权代理公司','申请中','普通专利','重点研发计划','纵向','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种知识图谱构建工具软件界面','陈杰',NULL,'计算机研究所','2023300444444',NULL,'2023-05-12',NULL,'外观设计','中国','北京专利代理事务所','授权','普通专利','校自主课题','横向','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种跨模态检索的特征对齐方法','吴芳;孙莉',NULL,'计算机研究所','2023300555555','ZL2023300555555','2023-09-01','2024-12-10','发明','中国','北京专利代理事务所','授权','普通专利','国家自然科学基金面上项目','纵向','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种分布式图查询加速装置','周涛;陈杰','Eve Wang','计算机研究所','2024100666666',NULL,'2024-02-18',NULL,'发明','中国','中科专利商标代理','申请中','普通专利','国家重点研发计划','纵向','内部','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种时序数据异常检测方法','郑宇;周涛',NULL,'计算机研究所','2024100777777',NULL,'2024-04-22',NULL,'发明','中国','北京专利代理事务所','申请中','普通专利','产学研合作项目','横向','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种少样本图像分类的数据增强装置','黄敏;徐磊',NULL,'计算机研究所','2024100888888','ZL2024100888888','2024-06-30','2026-01-15','发明','中国','北京专利代理事务所','授权','普通专利','国家自然科学基金青年项目','纵向','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '基于对比学习的视觉表征训练系统','何静;郭强',NULL,'计算机研究所','2024100999999',NULL,'2024-10-10',NULL,'发明','中国','上海知识产权代理公司','申请中','普通专利','国家自然科学基金面上项目','纵向','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '一种云原生服务流量调度方法','林峰',NULL,'计算机研究所','2024101000000',NULL,'2024-11-25',NULL,'发明','中国','北京专利代理事务所','申请中','普通专利','重点研发计划','纵向','公开','approved','normal',1,'cs_user'

  UNION ALL SELECT '一种毫米波MIMO混合预编码装置','刘洋;马超',NULL,'电子工程研究所','2022101111111','ZL2022101111111','2022-04-08','2024-07-30','发明','中国','电子部专利中心','授权','普通专利','国家自然科学基金面上项目','纵向','公开','approved','normal',2,'ee_user'
  UNION ALL SELECT '一种智能反射面辅助的信道估计方法','马超;刘洋','Linda Park','电子工程研究所','2023101222222','ZL2023101222222','2023-06-14','2025-03-18','发明','中国','电子部专利中心','授权','普通专利','重点研发计划','纵向','公开','approved','normal',2,'ee_user'
  UNION ALL SELECT '一种面向FPGA的低延迟信号处理装置','高远',NULL,'电子工程研究所','2023101333333',NULL,'2023-10-05',NULL,'实用新型','中国','西安专利代理所','申请中','普通专利','产学研合作项目','横向','公开','approved','normal',2,'ee_user'
  UNION ALL SELECT '一种太赫兹通信波束赋形优化方法','罗静;邓飞',NULL,'电子工程研究所','2024101444444',NULL,'2024-03-22',NULL,'发明','中国','电子部专利中心','申请中','普通专利','国家自然科学基金青年项目','纵向','公开','approved','normal',2,'ee_user'
  UNION ALL SELECT '一种雷达目标识别信号处理装置','方芳;秦岭',NULL,'电子工程研究所','2024101555555','ZL2024101555555','2024-08-19','2026-02-10','发明','中国','国防专利代理中心','授权','国防专利','国防基础科研计划','纵向','涉密','approved','normal',2,'ee_user'
) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM patent WHERE create_user IN ('cs_user','ee_user')
);

-- ---- 软件著作权 ~10 项 ----
INSERT INTO copyright (
  name, copyright_owner, registration_no, publish_date, register_date, version, software_type,
  cooperate_unit, depend_project, secret_level, approval_status, archive_status, dept_id, create_user
)
SELECT * FROM (
  SELECT '科研论文智能检索系统 V1.0' AS name, '计算机研究所' AS copyright_owner, '2022SR0111111' AS registration_no, '2022-05-01' AS publish_date, '2022-07-15' AS register_date, 'V1.0' AS version, '应用软件' AS software_type, '清华大学' AS cooperate_unit, '国家自然科学基金面上项目' AS depend_project, '公开' AS secret_level, 'approved' AS approval_status, 'normal' AS archive_status, 1 AS dept_id, 'cs_user' AS create_user
  UNION ALL SELECT '知识图谱可视化建模工具 V2.0','计算机研究所','2022SR0222222','2022-02-20','2022-09-10','V2.0','支撑软件',NULL,'校自主课题','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '低代码流程编排平台 V1.2','计算机研究所','2023SR0333333','2023-03-12','2023-06-20','V1.2','应用软件','大连理工大学','横向课题','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '联邦学习隐私保护实验平台 V1.0','计算机研究所','2023SR0444444','2023-08-01','2023-11-05','V1.0','支撑软件',NULL,'国家自然科学基金青年项目','内部','approved','normal',1,'cs_user'
  UNION ALL SELECT '交通信号优化仿真系统 V3.0','计算机研究所','2024SR0555555','2024-01-10','2024-04-18','V3.0','应用软件','同济大学','产学研合作项目','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '端侧模型压缩评估工具 V1.1','计算机研究所','2024SR0666666','2024-06-22','2024-09-30','V1.1','支撑软件',NULL,'国家自然科学基金面上项目','公开','approved','normal',1,'cs_user'
  UNION ALL SELECT '医疗影像可解释诊断辅助软件 V1.0','计算机研究所','2025SR0777777','2025-02-15','2025-05-20','V1.0','应用软件','首都医科大学','国家重点研发计划','涉密','approved','normal',1,'cs_user'
  UNION ALL SELECT '毫米波MIMO预编码仿真平台 V2.1','电子工程研究所','2023SR0888888','2023-04-08','2023-07-12','V2.1','支撑软件','电子科技大学','国家自然科学基金面上项目','公开','approved','normal',2,'ee_user'
  UNION ALL SELECT '智能反射面信道估计仿真系统 V1.0','电子工程研究所','2024SR0999999','2024-05-20','2024-08-25','V1.0','应用软件','西安电子科技大学','重点研发计划','公开','approved','normal',2,'ee_user'
  UNION ALL SELECT '雷达信号处理实验平台 V1.5','电子工程研究所','2025SR1000000','2025-03-30','2025-06-28','V1.5','支撑软件','国防科技大学','国防基础科研计划','涉密','approved','normal',2,'ee_user'
) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM copyright WHERE create_user IN ('cs_user','ee_user')
);

-- ---- 成果转化 ~8 项(关联到上面的论文/专利;result_id 用子查询按编号取,避免硬编码 ID) ----
INSERT INTO transform (
  result_type, result_id, contract_no, partner, contract_amount, received_amount, transform_date,
  transform_type, finish_status, distribute_ratio, follow_up_status, approval_status, archive_status,
  dept_id, create_user
)
SELECT * FROM (
  SELECT
    'patent' AS result_type,
    (SELECT id FROM patent WHERE application_no='2022100111111') AS result_id,
    'TR-2023-001' AS contract_no, '深圳智图科技有限公司' AS partner, 1200000.00 AS contract_amount,
    1200000.00 AS received_amount, '2023-09-01' AS transform_date, '技术转让' AS transform_type,
    '完成' AS finish_status, '院30% 团队70%' AS distribute_ratio, 'done' AS follow_up_status,
    'approved' AS approval_status, 'normal' AS archive_status, 1 AS dept_id, 'cs_user' AS create_user
  UNION ALL SELECT 'patent',(SELECT id FROM patent WHERE application_no='2023300555555'),'TR-2024-002','北京数言信息科技有限公司',800000.00,400000.00,'2024-03-15','普通许可','收款','院40% 团队60%','pending','approved','normal',1,'cs_user'
  UNION ALL SELECT 'patent',(SELECT id FROM patent WHERE application_no='2024100888888'),'TR-2024-003','杭州视界智能有限公司',600000.00,0.00,'2024-11-10','排他许可','合同签订','院50% 团队50%','pending','approved','normal',1,'cs_user'
  UNION ALL SELECT 'software',(SELECT id FROM copyright WHERE registration_no='2022SR0111111'),'TR-2023-004','上海知擎数据服务有限公司',500000.00,500000.00,'2023-12-01','独占许可','完成','院30% 团队70%','done','approved','normal',1,'cs_user'
  UNION ALL SELECT 'software',(SELECT id FROM copyright WHERE registration_no='2024SR0555555'),'TR-2024-005','苏州交规设计院',350000.00,150000.00,'2024-07-20','普通许可','收款','院40% 团队60%','pending','approved','normal',1,'cs_user'
  UNION ALL SELECT 'patent',(SELECT id FROM patent WHERE application_no='2022101111111'),'TR-2023-006','成都毫米通信技术有限公司',1800000.00,1800000.00,'2023-10-12','技术转让','完成','院30% 团队70%','done','approved','normal',2,'ee_user'
  UNION ALL SELECT 'patent',(SELECT id FROM patent WHERE application_no='2023101222222'),'TR-2024-007','南京瑞斯智能科技有限公司',950000.00,500000.00,'2024-05-08','普通许可','收款','院40% 团队60%','pending','approved','normal',2,'ee_user'
  UNION ALL SELECT 'software',(SELECT id FROM copyright WHERE registration_no='2023SR0888888'),'TR-2024-008','西安波束电子科技有限公司',450000.00,0.00,'2024-09-25','排他许可','合同签订','院50% 团队50%','pending','approved','normal',2,'ee_user'
) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM transform WHERE create_user IN ('cs_user','ee_user')
);

-- ---- 报表模板(4 个内置模板,覆盖 paper/patent/fee/transform) ----
-- report_type 必须是后端 getTableName 能识别的英文键(paper/patent/fee/transform)。
-- config_json.columns 的 key 必须是【原始 SQL 列名(snake_case)】,因为导出走
-- SELECT * 原始查询(不经实体 camelCase 转换)。按 code 幂等。
INSERT INTO report_template (code, name, report_type, config_json, scope, is_active, create_user)
SELECT * FROM (
  SELECT 'PAPER_LIST' AS code, '论文列表报表' AS name, 'paper' AS report_type,
    '{"columns":[{"header":"标题","key":"title"},{"header":"第一作者","key":"first_author"},{"header":"期刊","key":"journal"},{"header":"发表年份","key":"publish_year"}]}' AS config_json,
    'all' AS scope, TRUE AS is_active, 'admin' AS create_user
  UNION ALL SELECT 'PATENT_LIST','专利列表报表','patent',
    '{"columns":[{"header":"专利名称","key":"name"},{"header":"发明人","key":"inventors"},{"header":"专利类型","key":"patent_type"},{"header":"申请号","key":"application_no"}]}',
    'all', TRUE, 'admin'
  UNION ALL SELECT 'FEE_LIST','费用列表报表','fee',
    '{"columns":[{"header":"关联成果","key":"relation_name"},{"header":"费用类型","key":"fee_type"},{"header":"经费来源","key":"fund_source"},{"header":"金额","key":"amount"},{"header":"应缴日期","key":"due_date"}]}',
    'all', TRUE, 'admin'
  UNION ALL SELECT 'TRANSFORM_LIST','成果转化报表','transform',
    '{"columns":[{"header":"交易对方","key":"partner"},{"header":"合同金额","key":"contract_amount"},{"header":"转化类型","key":"transform_type"},{"header":"当前节点","key":"finish_status"}]}',
    'all', TRUE, 'admin'
) AS d
WHERE NOT EXISTS (SELECT 1 FROM report_template WHERE code IN ('PAPER_LIST','PATENT_LIST','FEE_LIST','TRANSFORM_LIST'));
