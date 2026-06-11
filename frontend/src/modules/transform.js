import { createCrudApi } from '../api/createCrudApi'

const statusTagType = (v) => {
  if (['完成'].includes(v)) return 'success'
  if (['合同中止', '转化失败', '合同作废'].includes(v)) return 'danger'
  if (v === '收款') return 'warning'
  return 'info'
}

export default {
  entityName: '转化项目',
  searchPlaceholder: '按交易对方搜索',
  newButtonText: '新增转化',
  resourcePath: 'transforms',
  api: createCrudApi('transforms'),

  columns: [
    { prop: 'contractNo', label: '合同编号', width: 140 },
    { prop: 'partner', label: '交易对方', minWidth: 160, showOverflow: true },
    { prop: 'transformType', label: '转化类型', width: 110 },
    { prop: 'contractAmount', label: '合同金额(元)', width: 120 },
    { prop: 'receivedAmount', label: '已到账(元)', width: 110 },
    { prop: 'transformDate', label: '转化日期', width: 100 },
    { prop: 'finishStatus', label: '当前节点', width: 100, tag: true, tagType: statusTagType },
  ],

  blankForm: () => ({
    resultType: '', resultId: null,
    contractNo: '', partner: '',
    contractAmount: null, receivedAmount: null,
    transformDate: '', transformType: '',
    finishStatus: '合同签订', abnormalReason: '',
    distributeRatio: '', deptId: null, createUser: '',
  }),

  formSections: [
    {
      title: '关联成果',
      fields: [
        {
          prop: 'resultType', label: '成果类型', type: 'select',
          options: ['paper', 'patent', 'copyright'],
        },
        { prop: 'resultId', label: '成果ID', type: 'number', min: 1 },
      ],
    },
    {
      title: '合同信息',
      fields: [
        { prop: 'contractNo', label: '合同编号', placeholder: '如 HT-2025-001' },
        { prop: 'partner', label: '交易对方', span: 24 },
        {
          prop: 'transformType', label: '转化类型', type: 'select',
          options: ['技术转让', '独占许可', '排他许可', '普通许可', '作价入股'],
        },
        { prop: 'transformDate', label: '转化日期', type: 'date' },
        { prop: 'contractAmount', label: '合同金额(元)', type: 'number', min: 0, precision: 2 },
        { prop: 'receivedAmount', label: '已到账(元)', type: 'number', min: 0, precision: 2 },
      ],
    },
    {
      title: '节点与收益',
      fields: [
        {
          prop: 'finishStatus', label: '当前节点', type: 'select',
          options: ['合同签订', '收款', '开票', '完成', '合同中止', '转化失败', '合同作废'],
        },
        { prop: 'abnormalReason', label: '异常原因', placeholder: '中止/失败/作废时填写' },
        { prop: 'distributeRatio', label: '收益分配比例', placeholder: '如 院内40%/团队40%/个人20%', span: 24 },
      ],
    },
    {
      title: '归属',
      fields: [
        { prop: 'deptId', label: '所属部门ID', type: 'number', min: 1 },
        { prop: 'createUser', label: '登记人' },
      ],
    },
  ],
}
