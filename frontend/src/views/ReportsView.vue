<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import reportsApi from '../api/reports'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const isSysAdmin = computed(() => auth.user?.role === 'sys_admin')

const activeTab = ref('templates')
const loading = ref(false)

// ===== 报表模板 =====
const templates = ref([])
const templateTotal = ref(0)
const templateFilter = reactive({ page: 1, pageSize: 20 })

const REPORT_TYPES = ['成果汇总', '费用统计', '部门统计', '年度趋势']

async function loadTemplates() {
  loading.value = true
  try {
    const res = await reportsApi.listTemplates(templateFilter)
    templates.value = res.items || res
    templateTotal.value = res.total || 0
  } catch { ElMessage.error('加载模板失败') }
  finally { loading.value = false }
}

// 模板弹窗
const tplDialog = ref(false)
const isEditTpl = ref(false)
const savingTpl = ref(false)
const tplFormRef = ref(null)
const tplForm = reactive({
  name: '',
  reportType: '',
  scope: 'all',
  description: '',
})
let editTplId = null

function openAddTpl() {
  isEditTpl.value = false
  editTplId = null
  Object.assign(tplForm, { name: '', reportType: '', scope: 'all', description: '' })
  tplDialog.value = true
}

function openEditTpl(row) {
  isEditTpl.value = true
  editTplId = row.id
  Object.assign(tplForm, {
    name: row.name,
    reportType: row.reportType || '',
    scope: row.scope || 'all',
    description: row.description || '',
  })
  tplDialog.value = true
}

async function saveTpl() {
  savingTpl.value = true
  try {
    if (isEditTpl.value) await reportsApi.updateTemplate(editTplId, { ...tplForm })
    else await reportsApi.createTemplate({ ...tplForm })
    tplDialog.value = false
    ElMessage.success('保存成功')
    await loadTemplates()
  } catch { ElMessage.error('保存失败') }
  finally { savingTpl.value = false }
}

async function deleteTpl(row) {
  await ElMessageBox.confirm(`确认删除模板「${row.name}」？`, '删除确认', { type: 'warning' })
  try {
    await reportsApi.deleteTemplate(row.id)
    ElMessage.success('已删除')
    await loadTemplates()
  } catch { ElMessage.error('删除失败') }
}

// 导出
const exportLoading = ref(false)
async function handleExport(row, format) {
  exportLoading.value = true
  try {
    await reportsApi.exportReport({ templateId: row.id, format })
    ElMessage.success('导出任务已提交')
  } catch { ElMessage.error('导出失败') }
  finally { exportLoading.value = false }
}

// ===== 导出历史 =====
const exportLogs = ref([])
const exportTotal = ref(0)
const exportFilter = reactive({ page: 1, pageSize: 20 })

const EXPORT_STATUS_TAG = {
  pending: { label: '生成中', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '失败', type: 'danger' },
}

async function loadExportLogs() {
  loading.value = true
  try {
    const res = await reportsApi.listExportLogs(exportFilter)
    exportLogs.value = res.items || res
    exportTotal.value = res.total || 0
  } catch { ElMessage.error('加载导出历史失败') }
  finally { loading.value = false }
}

function downloadFile(id) {
  return `/api/reports/exports/${id}/download`
}

// ===== 定时报表 =====
const scheduledTasks = ref([])
const scheduledTotal = ref(0)
const scheduledFilter = reactive({ page: 1, pageSize: 20 })

const taskDialog = ref(false)
const isEditTask = ref(false)
const savingTask = ref(false)
const taskFormRef = ref(null)
const taskForm = reactive({
  name: '',
  templateId: null,
  cronExpression: '',
  format: 'xlsx',
  isActive: true,
})
let editTaskId = null

async function loadScheduledTasks() {
  loading.value = true
  try {
    const res = await reportsApi.listScheduledTasks(scheduledFilter)
    scheduledTasks.value = res.items || res
    scheduledTotal.value = res.total || 0
  } catch { ElMessage.error('加载定时报表失败') }
  finally { loading.value = false }
}

function openAddTask() {
  isEditTask.value = false
  editTaskId = null
  Object.assign(taskForm, { name: '', templateId: null, cronExpression: '', format: 'xlsx', isActive: true })
  taskDialog.value = true
}

function openEditTask(row) {
  isEditTask.value = true
  editTaskId = row.id
  Object.assign(taskForm, {
    name: row.name,
    templateId: row.templateId || null,
    cronExpression: row.cronExpression || '',
    format: row.format || 'xlsx',
    isActive: row.isActive,
  })
  taskDialog.value = true
}

async function saveTask() {
  savingTask.value = true
  try {
    if (isEditTask.value) await reportsApi.updateScheduledTask(editTaskId, { ...taskForm })
    else await reportsApi.createScheduledTask({ ...taskForm })
    taskDialog.value = false
    ElMessage.success('保存成功')
    await loadScheduledTasks()
  } catch { ElMessage.error('保存失败') }
  finally { savingTask.value = false }
}

async function deleteTask(row) {
  await ElMessageBox.confirm(`确认删除定时报表「${row.name}」？`, '删除确认', { type: 'warning' })
  try {
    await reportsApi.deleteScheduledTask(row.id)
    ElMessage.success('已删除')
    await loadScheduledTasks()
  } catch { ElMessage.error('删除失败') }
}

function onTabChange(tab) {
  if (tab === 'templates') loadTemplates()
  else if (tab === 'exports') loadExportLogs()
  else if (tab === 'scheduled') loadScheduledTasks()
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(loadTemplates)
</script>

<template>
  <div class="reports-page">
    <el-tabs v-model="activeTab" @tab-change="onTabChange">

      <!-- 报表模板 -->
      <el-tab-pane label="报表模板" name="templates">
        <div class="toolbar">
          <div class="spacer" />
          <el-button type="primary" @click="openAddTpl">+ 新增模板</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="templates" v-loading="loading" border size="small" style="width:100%">
            <el-table-column label="模板名称" prop="name" min-width="180" show-overflow-tooltip />
            <el-table-column label="报表类型" prop="reportType" width="120" align="center" />
            <el-table-column label="范围" width="100" align="center">
              <template #default="{ row }">
                <el-tag size="small">{{ row.scope === 'all' ? '全部' : row.scope }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="描述" prop="description" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ row.description || '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="{ row }">
                <el-dropdown trigger="click" @command="(cmd) => handleExport(row, cmd)">
                  <el-button link size="small" type="primary">导出</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="xlsx">XLSX</el-dropdown-item>
                      <el-dropdown-item command="pdf">PDF</el-dropdown-item>
                      <el-dropdown-item command="csv">CSV</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button link size="small" @click="openEditTpl(row)">编辑</el-button>
                <el-button link size="small" type="danger" @click="deleteTpl(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 导出历史 -->
      <el-tab-pane label="导出历史" name="exports">
        <div class="table-wrap">
          <el-table :data="exportLogs" v-loading="loading" border size="small" style="width:100%">
            <el-table-column label="模板" prop="templateName" min-width="160" show-overflow-tooltip />
            <el-table-column label="格式" prop="format" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ (row.format || '').toUpperCase() }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="EXPORT_STATUS_TAG[row.status]?.type" size="small">
                  {{ EXPORT_STATUS_TAG[row.status]?.label || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="生成时间" width="160" align="center">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作人" prop="operatorName" width="100" align="center" />
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template #default="{ row }">
                <a v-if="row.status === 'completed'" :href="downloadFile(row.id)" target="_blank">
                  <el-button link size="small" type="primary">下载</el-button>
                </a>
                <span v-else style="color: var(--text-secondary); font-size: 12px">—</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 定时报表 (admin) -->
      <el-tab-pane v-if="isSysAdmin" label="定时报表" name="scheduled">
        <div class="toolbar">
          <div class="spacer" />
          <el-button type="primary" @click="openAddTask">+ 新增定时报表</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="scheduledTasks" v-loading="loading" border size="small" style="width:100%">
            <el-table-column label="名称" prop="name" min-width="160" show-overflow-tooltip />
            <el-table-column label="Cron 表达式" prop="cronExpression" width="140" align="center" />
            <el-table-column label="格式" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ (row.format || 'xlsx').toUpperCase() }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="启用" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="上次执行" width="160" align="center">
              <template #default="{ row }">{{ formatTime(row.lastRunTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link size="small" @click="openEditTask(row)">编辑</el-button>
                <el-button link size="small" type="danger" @click="deleteTask(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 模板弹窗 -->
    <el-dialog
      v-model="tplDialog"
      :title="isEditTpl ? '编辑模板' : '新增模板'"
      width="540px"
      destroy-on-close
    >
      <el-form :model="tplForm" ref="tplFormRef" label-width="90px"
        :rules="{ name: [{ required: true, message: '请填写模板名称' }] }"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="tplForm.name" placeholder="输入模板名称" />
        </el-form-item>
        <el-form-item label="报表类型">
          <el-select v-model="tplForm.reportType" placeholder="选择报表类型" clearable style="width:100%">
            <el-option v-for="t in REPORT_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="范围">
          <el-select v-model="tplForm.scope" style="width:100%">
            <el-option label="全部" value="all" />
            <el-option label="本部门" value="dept" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="tplForm.description" type="textarea" :rows="3" placeholder="模板说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tplDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingTpl" @click="saveTpl">保存</el-button>
      </template>
    </el-dialog>

    <!-- 定时报表弹窗 -->
    <el-dialog
      v-model="taskDialog"
      :title="isEditTask ? '编辑定时报表' : '新增定时报表'"
      width="520px"
      destroy-on-close
    >
      <el-form :model="taskForm" ref="taskFormRef" label-width="100px"
        :rules="{
          name: [{ required: true, message: '请填写名称' }],
          cronExpression: [{ required: true, message: '请填写 Cron 表达式' }],
        }"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="taskForm.name" placeholder="输入任务名称" />
        </el-form-item>
        <el-form-item label="关联模板">
          <el-select v-model="taskForm.templateId" placeholder="选择模板" clearable style="width:100%">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Cron 表达式" prop="cronExpression">
          <el-input v-model="taskForm.cronExpression" placeholder="如: 0 0 8 * * 1" />
        </el-form-item>
        <el-form-item label="导出格式">
          <el-select v-model="taskForm.format" style="width:100%">
            <el-option label="XLSX" value="xlsx" />
            <el-option label="PDF" value="pdf" />
            <el-option label="CSV" value="csv" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="taskForm.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingTask" @click="saveTask">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.reports-page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.spacer { flex: 1; }
.table-wrap { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
</style>
