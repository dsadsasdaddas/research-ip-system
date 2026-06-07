<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { feesApi } from '../api/fees'

// ===== 预警配置 =====
const ALERT_MAP = {
  0: { label: '正常',   type: '',        tagType: 'info'    },
  1: { label: '30天预警', type: 'warning', tagType: 'warning' },
  2: { label: '15天预警', type: 'warning', tagType: 'warning' },
  3: { label: '7天预警',  type: 'danger',  tagType: 'danger'  },
  4: { label: '已逾期',  type: 'danger',  tagType: 'danger'  },
}
const PAY_STATUS_MAP = {
  pending:   { label: '待缴',   type: 'info'    },
  paid:      { label: '已缴',   type: 'success' },
  overdue:   { label: '逾期',   type: 'danger'  },
  cancelled: { label: '已取消', type: ''        },
}
const FEE_TYPES     = ['申请费', '年费', '代理费', '维持费', '复审费']
const FUND_SOURCES  = ['院内经费', '纵向课题', '横向课题', '外协资助']
const RELATION_TYPES = [
  { label: '专利', value: 'patent' },
  { label: '软件著作权', value: 'copyright' },
]

// ===== 列表数据 =====
const loading  = ref(false)
const list     = ref([])
const summary  = ref(null)

const filter = reactive({
  keyword:      '',
  relationType: '',
  payStatus:    '',
  alertLevel:   '',
})

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (filter.keyword)      params.keyword      = filter.keyword
    if (filter.relationType) params.relationType = filter.relationType
    if (filter.payStatus)    params.payStatus    = filter.payStatus
    if (filter.alertLevel !== '') params.alertLevel = filter.alertLevel

    const [rows, sum] = await Promise.all([
      feesApi.list(params),
      feesApi.alertSummary(),
    ])
    list.value    = rows
    summary.value = sum
  } catch (e) {
    ElMessage.error('加载失败：' + (e.message || ''))
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// ===== 弹窗 =====
const dialogVisible = ref(false)
const isEdit        = ref(false)
const saving        = ref(false)
const formRef       = ref(null)
const form          = reactive({
  relationType: '',
  relationId:   null,
  relationName: '',
  feeType:      '',
  fundSource:   '',
  amount:       null,
  dueDate:      '',
  paidDate:     '',
  voucherNo:    '',
  payStatus:    'pending',
  remark:       '',
})
let editId = null

const rules = {
  relationName: [{ required: true, message: '请填写关联成果名称' }],
  feeType:      [{ required: true, message: '请选择费用类型'     }],
  dueDate:      [{ required: true, message: '请选择截止日期'     }],
}

function openAdd() {
  isEdit.value = false
  editId = null
  Object.assign(form, {
    relationType: '', relationId: null, relationName: '',
    feeType: '', fundSource: '', amount: null,
    dueDate: '', paidDate: '', voucherNo: '',
    payStatus: 'pending', remark: '',
  })
  dialogVisible.value = true
}

function openEdit(row) {
  isEdit.value = true
  editId = row.id
  Object.assign(form, {
    relationType: row.relationType || '',
    relationId:   row.relationId   || null,
    relationName: row.relationName || '',
    feeType:      row.feeType      || '',
    fundSource:   row.fundSource   || '',
    amount:       row.amount       || null,
    dueDate:      row.dueDate      || '',
    paidDate:     row.paidDate     || '',
    voucherNo:    row.voucherNo    || '',
    payStatus:    row.payStatus    || 'pending',
    remark:       row.remark       || '',
  })
  dialogVisible.value = true
}

async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await feesApi.update(editId, { ...form })
    } else {
      await feesApi.create({ ...form })
    }
    dialogVisible.value = false
    ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
    await loadData()
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || ''))
  } finally {
    saving.value = false
  }
}

async function markPaid(row) {
  try {
    await feesApi.update(row.id, { payStatus: 'paid', paidDate: new Date().toISOString().slice(0, 10) })
    ElMessage.success('已标记为已缴')
    await loadData()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function remove(row) {
  await ElMessageBox.confirm(`确认删除该费用记录？`, '删除确认', { type: 'warning' })
  await feesApi.remove(row.id)
  ElMessage.success('已删除')
  await loadData()
}

// 表格行样式：逾期红底，7天橙底
function rowClass({ row }) {
  if (row.alertLevel === 4) return 'row-overdue'
  if (row.alertLevel === 3) return 'row-warning'
  return ''
}
</script>

<template>
  <div class="fees-page">

    <!-- 预警汇总卡 -->
    <div class="summary-bar" v-if="summary">
      <div class="sum-card">
        <span class="sum-num">{{ summary.total }}</span>
        <span class="sum-label">待缴总数</span>
      </div>
      <div class="sum-card alert-30" v-if="summary.day30">
        <span class="sum-num">{{ summary.day30 }}</span>
        <span class="sum-label">30天预警</span>
      </div>
      <div class="sum-card alert-15" v-if="summary.day15">
        <span class="sum-num">{{ summary.day15 }}</span>
        <span class="sum-label">15天预警</span>
      </div>
      <div class="sum-card alert-7" v-if="summary.day7">
        <span class="sum-num">{{ summary.day7 }}</span>
        <span class="sum-label">7天预警</span>
      </div>
      <div class="sum-card alert-overdue" v-if="summary.overdue">
        <span class="sum-num">{{ summary.overdue }}</span>
        <span class="sum-label">已逾期</span>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="filter.keyword"
          placeholder="搜索成果名称"
          clearable
          style="width: 200px"
          @change="loadData"
        />
        <el-select v-model="filter.relationType" placeholder="关联类型" clearable style="width: 130px" @change="loadData">
          <el-option v-for="t in RELATION_TYPES" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        <el-select v-model="filter.payStatus" placeholder="缴费状态" clearable style="width: 120px" @change="loadData">
          <el-option label="待缴"   value="pending"   />
          <el-option label="已缴"   value="paid"      />
          <el-option label="逾期"   value="overdue"   />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-select v-model="filter.alertLevel" placeholder="预警等级" clearable style="width: 130px" @change="loadData">
          <el-option label="30天预警" :value="1" />
          <el-option label="15天预警" :value="2" />
          <el-option label="7天预警"  :value="3" />
          <el-option label="已逾期"  :value="4" />
        </el-select>
      </div>
      <el-button type="primary" @click="openAdd">+ 新增费用</el-button>
    </div>

    <!-- 表格 -->
    <div class="table-wrap">
      <el-table
        :data="list"
        v-loading="loading"
        :row-class-name="rowClass"
        border
        size="small"
        style="width:100%"
      >
        <el-table-column label="预警" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="ALERT_MAP[row.alertLevel]?.tagType" size="small" v-if="row.alertLevel > 0">
              {{ ALERT_MAP[row.alertLevel]?.label }}
            </el-tag>
            <span v-else style="color: var(--text-secondary); font-size: 12px">—</span>
          </template>
        </el-table-column>

        <el-table-column label="关联成果" prop="relationName" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            {{ row.relationType === 'patent' ? '专利' : row.relationType === 'copyright' ? '软著' : row.relationType || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="费用类型" prop="feeType" width="90" align="center" />
        <el-table-column label="经费来源" prop="fundSource" width="110" align="center" show-overflow-tooltip />
        <el-table-column label="金额(元)" width="110" align="right">
          <template #default="{ row }">
            {{ row.amount != null ? Number(row.amount).toLocaleString() : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="截止日期" prop="dueDate" width="110" align="center" />
        <el-table-column label="实缴日期" prop="paidDate" width="110" align="center">
          <template #default="{ row }">{{ row.paidDate || '—' }}</template>
        </el-table-column>
        <el-table-column label="凭证号" prop="voucherNo" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row.voucherNo || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="PAY_STATUS_MAP[row.payStatus]?.type" size="small">
              {{ PAY_STATUS_MAP[row.payStatus]?.label || row.payStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              link size="small" type="success"
              v-if="row.payStatus === 'pending' || row.payStatus === 'overdue'"
              @click="markPaid(row)"
            >标记已缴</el-button>
            <el-button link size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑费用记录' : '新增费用记录'"
      width="560px"
      destroy-on-close
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px" size="default">
        <el-form-item label="关联类型">
          <el-select v-model="form.relationType" placeholder="选择类型" clearable style="width:100%">
            <el-option v-for="t in RELATION_TYPES" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="成果名称" prop="relationName">
          <el-input v-model="form.relationName" placeholder="填写关联专利或软著名称" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="费用类型" prop="feeType">
              <el-select v-model="form.feeType" placeholder="选择" style="width:100%">
                <el-option v-for="t in FEE_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经费来源">
              <el-select v-model="form.fundSource" placeholder="选择" clearable style="width:100%">
                <el-option v-for="s in FUND_SOURCES" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="金额(元)">
              <el-input-number v-model="form.amount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期" prop="dueDate">
              <el-date-picker v-model="form.dueDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="实缴日期">
              <el-date-picker v-model="form.paidDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="凭证编号">
              <el-input v-model="form.voucherNo" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="缴费状态">
          <el-select v-model="form.payStatus" style="width:100%">
            <el-option label="待缴"   value="pending"   />
            <el-option label="已缴"   value="paid"      />
            <el-option label="逾期"   value="overdue"   />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.fees-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 预警汇总栏 */
.summary-bar {
  display: flex;
  gap: 10px;
}
.sum-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
}
.sum-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}
.sum-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.alert-30 { border-color: #e6a23c; background: #fdf6ec; }
.alert-30 .sum-num { color: #e6a23c; }
.alert-15 { border-color: #e6812a; background: #fdf0e0; }
.alert-15 .sum-num { color: #e6812a; }
.alert-7  { border-color: #f56c6c; background: #fef0f0; }
.alert-7  .sum-num { color: #f56c6c; }
.alert-overdue { border-color: #c0392b; background: #fde8e8; }
.alert-overdue .sum-num { color: #c0392b; }

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.toolbar-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.table-wrap {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}
</style>

<!-- 全局行色：需要非 scoped，让 el-table 的 tr 生效 -->
<style>
.el-table .row-overdue td { background: #fde8e8 !important; }
.el-table .row-warning  td { background: #fdf6ec !important; }
</style>
