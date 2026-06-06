import { createCrudApi } from '../api/createCrudApi'

// 密级标签颜色:公开=中性灰,其余(内部/涉密)=红,颜色只用来标状态
const secretTagType = (v) => (v === '公开' ? 'info' : 'danger')

/**
 * 论文模块配置(字段对照说明书 §3.1.1 / §6.2)。
 * 页面本身由通用组件 ResourcePage 渲染,这里只描述"论文长什么样"。
 */
export default {
  entityName: '论文',
  searchPlaceholder: '按标题搜索',
  newButtonText: '新增论文',
  api: createCrudApi('papers'),

  // 列表显示哪些列
  columns: [
    { prop: 'title', label: '标题', minWidth: 240, showOverflow: true },
    { prop: 'firstAuthor', label: '第一作者', width: 100 },
    { prop: 'journal', label: '期刊', width: 160, showOverflow: true },
    { prop: 'publishYear', label: '年份', width: 80 },
    { prop: 'includedType', label: '收录', width: 90 },
    { prop: 'partition', label: '分区', width: 80 },
    { prop: 'secretLevel', label: '密级', width: 84, tag: true, tagType: secretTagType },
  ],

  // 空白表单
  blankForm: () => ({
    title: '', doi: '', firstAuthor: '', correspondingAuthor: '',
    authors: '', outerAuthors: '', cooperateUnit: '',
    journal: '', issnCn: '', volumePage: '', publishYear: null,
    impactFactor: null, includedType: '', partition: '', status: '',
    summary: '', secretLevel: '公开', dependProject: '',
    deptId: null, createUser: '',
  }),

  // 弹窗表单字段(分区块)
  formSections: [
    {
      title: '基础信息',
      fields: [
        { prop: 'title', label: '论文标题', span: 24, required: true, placeholder: '必填' },
        { prop: 'doi', label: 'DOI', placeholder: '如 10.1038/xxxxx' },
        { prop: 'firstAuthor', label: '第一作者' },
        { prop: 'correspondingAuthor', label: '通讯作者' },
        { prop: 'cooperateUnit', label: '合作单位' },
        { prop: 'authors', label: '院内作者', placeholder: '多个用逗号隔开' },
        { prop: 'outerAuthors', label: '外单位作者', placeholder: '多个用逗号隔开' },
      ],
    },
    {
      title: '期刊与收录',
      fields: [
        { prop: 'journal', label: '期刊名称' },
        { prop: 'issnCn', label: 'ISSN/CN' },
        { prop: 'volumePage', label: '卷期页码', placeholder: '如 Vol.12(3), 45-60' },
        { prop: 'publishYear', label: '发表年份', type: 'number', min: 1900, max: 2100 },
        { prop: 'impactFactor', label: '影响因子', type: 'number', min: 0, precision: 3 },
        { prop: 'includedType', label: '收录情况', type: 'select', options: ['SCI', 'EI', 'CSCD', 'CSSCI', '中文核心', '其他'] },
        { prop: 'partition', label: '中科院分区', type: 'select', options: ['一区', '二区', '三区', '四区'] },
        { prop: 'status', label: '成果状态', type: 'select', options: ['在线发表', '正式出版'] },
      ],
    },
    {
      title: '摘要与归属',
      fields: [
        { prop: 'summary', label: '摘要', span: 24, type: 'textarea' },
        { prop: 'secretLevel', label: '密级', type: 'select', options: ['公开', '内部', '涉密'] },
        { prop: 'dependProject', label: '依托项目' },
        { prop: 'deptId', label: '所属部门ID', type: 'number', min: 1 },
        { prop: 'createUser', label: '登记人' },
      ],
    },
  ],
}
