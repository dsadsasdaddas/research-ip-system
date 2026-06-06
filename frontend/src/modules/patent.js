import { createCrudApi } from '../api/createCrudApi'

const secretTagType = (v) => (v === '公开' ? 'info' : 'danger')
// 法律状态:授权=绿,申请中=黄,驳回=红,失效=灰
const legalTagType = (v) =>
  ({ 授权: 'success', 申请中: 'warning', 驳回: 'danger', 失效: 'info' }[v] || 'info')

/**
 * 专利模块配置(字段对照说明书 §3.1.2 / §6.2)。
 */
export default {
  entityName: '专利',
  searchPlaceholder: '按专利名称搜索',
  newButtonText: '新增专利',
  api: createCrudApi('patents'),

  columns: [
    { prop: 'name', label: '专利名称', minWidth: 220, showOverflow: true },
    { prop: 'applicationNo', label: '申请号', width: 140 },
    { prop: 'patentType', label: '类型', width: 100 },
    { prop: 'legalStatus', label: '法律状态', width: 100, tag: true, tagType: legalTagType },
    { prop: 'nextFeeDate', label: '下次缴费日', width: 120 },
    { prop: 'secretLevel', label: '密级', width: 84, tag: true, tagType: secretTagType },
  ],

  blankForm: () => ({
    name: '', inventors: '', outerInventors: '', patentee: '',
    applicationNo: '', grantNo: '', filingDate: null, grantDate: null,
    patentType: '', country: '中国', nextFeeDate: null, feeAmount: null,
    agency: '', legalStatus: '申请中', pctStage: '', nationalStage: '',
    entryDate: null, patentMark: '普通专利', fundSource: '',
    secretLevel: '公开', dependProject: '', deptId: null, createUser: '',
  }),

  formSections: [
    {
      title: '基础信息',
      fields: [
        { prop: 'name', label: '专利名称', span: 24, required: true, placeholder: '必填' },
        { prop: 'inventors', label: '院内发明人', placeholder: '多个用逗号隔开' },
        { prop: 'outerInventors', label: '外单位发明人', placeholder: '多个用逗号隔开' },
        { prop: 'patentee', label: '专利权人' },
        { prop: 'applicationNo', label: '申请号' },
        { prop: 'grantNo', label: '授权号' },
        { prop: 'patentType', label: '专利类型', type: 'select', options: ['发明', '实用新型', '外观设计', 'PCT'] },
        { prop: 'country', label: '国别' },
      ],
    },
    {
      title: '申请与法律状态',
      fields: [
        { prop: 'filingDate', label: '申请日', type: 'date' },
        { prop: 'grantDate', label: '授权日', type: 'date' },
        { prop: 'legalStatus', label: '法律状态', type: 'select', options: ['申请中', '授权', '失效', '驳回'] },
        { prop: 'nextFeeDate', label: '年费下次缴费日', type: 'date' },
        { prop: 'feeAmount', label: '年费金额(元)', type: 'number', min: 0, precision: 2 },
        { prop: 'agency', label: '代理机构' },
      ],
    },
    {
      title: '扩展与归属',
      fields: [
        { prop: 'pctStage', label: 'PCT国际阶段' },
        { prop: 'nationalStage', label: '国家阶段' },
        { prop: 'entryDate', label: '国际进入日期', type: 'date' },
        { prop: 'patentMark', label: '专利标识', type: 'select', options: ['普通专利', '国防专利', '涉密专利'] },
        { prop: 'fundSource', label: '经费来源' },
        { prop: 'secretLevel', label: '密级', type: 'select', options: ['公开', '内部', '涉密'] },
        { prop: 'dependProject', label: '依托项目' },
        { prop: 'deptId', label: '所属部门ID', type: 'number', min: 1 },
        { prop: 'createUser', label: '登记人' },
      ],
    },
  ],
}
