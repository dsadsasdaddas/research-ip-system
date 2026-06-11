import { createCrudApi } from '../api/createCrudApi'

const secretTagType = (v) => (v === '公开' ? 'info' : 'danger')

/**
 * 软件著作权模块配置(字段对照说明书 §3.1.3 / §6.2)。
 */
export default {
  entityName: '软著',
  searchPlaceholder: '按软著名称搜索',
  newButtonText: '新增软著',
  resourcePath: 'copyrights',
  api: createCrudApi('copyrights'),

  columns: [
    { prop: 'name', label: '软著名称', minWidth: 220, showOverflow: true },
    { prop: 'registrationNo', label: '登记号', width: 150 },
    { prop: 'version', label: '版本号', width: 100 },
    { prop: 'softwareType', label: '软件类别', width: 120 },
    { prop: 'registerDate', label: '登记日期', width: 120 },
    { prop: 'secretLevel', label: '密级', width: 84, tag: true, tagType: secretTagType },
  ],

  blankForm: () => ({
    name: '', copyrightOwner: '', registrationNo: '',
    publishDate: null, registerDate: null, version: '', softwareType: '',
    softwareIntro: '', runEnv: '', cooperateUnit: '',
    secretLevel: '公开', dependProject: '', deptId: null, createUser: '',
  }),

  formSections: [
    {
      title: '基础信息',
      fields: [
        { prop: 'name', label: '软著名称', span: 24, required: true, placeholder: '必填' },
        { prop: 'copyrightOwner', label: '著作权人' },
        { prop: 'registrationNo', label: '登记号' },
        { prop: 'version', label: '版本号', placeholder: '如 V1.0' },
        { prop: 'softwareType', label: '软件类别', type: 'select', options: ['应用软件', '系统软件', '工具软件', '嵌入式软件', '其他'] },
        { prop: 'publishDate', label: '首次发表日期', type: 'date' },
        { prop: 'registerDate', label: '登记日期', type: 'date' },
      ],
    },
    {
      title: '扩展与归属',
      fields: [
        { prop: 'softwareIntro', label: '软件功能简介', span: 24, type: 'textarea' },
        { prop: 'runEnv', label: '运行环境' },
        { prop: 'cooperateUnit', label: '合作单位' },
        { prop: 'secretLevel', label: '密级', type: 'select', options: ['公开', '内部', '涉密'] },
        { prop: 'dependProject', label: '依托项目' },
        { prop: 'deptId', label: '所属部门ID', type: 'number', min: 1 },
        { prop: 'createUser', label: '登记人' },
      ],
    },
  ],
}
