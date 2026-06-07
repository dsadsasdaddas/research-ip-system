<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { remindersApi } from '../api/reminders'

const LEVEL_TAG = { '普通': '', '重要': 'warning', '紧急': 'danger' }

// ===== 数据 =====
const loading  = ref(false)
const tasks    = ref([])
const summary  = ref(null)
const activeTab = ref('tasks') // tasks | rules

const filter = reactive({ keyword: '', remindLevel: '', isConfirm: '' })

async function loadTasks() {
  loading.value = true
  try {
    const params = {}
    if (filter.keyword)     params.keyword     = filter.keyword
    if (filter.remindLevel) params.remindLevel = filter.remindLevel
    if (filter.isConfirm !== '') params.isConfirm = filter.isConfirm
    const [list, sum] = await Promise.all([
      remindersApi.listTasks(params),
      remindersApi.summary(),
    ])
    tasks.value   = list
    summary.value = sum
  } catch (e) { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

// ===== 任务弹窗 =====
const taskDialog  = ref(false)
const isEditTask  = ref(false)
const savingTask  = ref(false)
const taskFormRef = ref(null)
const taskForm    = reactive({
  title: '', targetType: '', deadline: '', remindDate: '',
  remindLevel: '普通', receiverName: '', deptId: null, remark: '',
})
let editTaskId = null

function openAddTask() {
  isEditTask.value = false; editTaskId = null
  Object.assign(taskForm, { title: '', targetType: '', deadline: '', remindDate: '',
    remindLevel: '普通', receiverName: '', deptId: null, remark: '' })
  taskDialog.value = true
}

function openEditTask(row) {
  isEditTask.value = true; editTaskId = row.id
  Object.assign(taskForm, {
    title: row.title, targetType: row.targetType || '', deadline: row.deadline || '',
    remindDate: row.remindDate || '', remindLevel: row.remindLevel || '普通',
    receiverName: row.receiverName || '', deptId: row.deptId || null, remark: row.remark || '',
  })
  taskDialog.value = true
}

async function saveTask() {
  await taskFormRef.value.validate()
  savingTask.value = true
  try {
    if (isEditTask.value) await remindersApi.updateTask(editTaskId, { ...taskForm })
    else                  await remindersApi.createTask({ ...taskForm })
    taskDialog.value = false
    ElMessage.success('保存成功')
    await loadTasks()
  } catch { ElMessage.error('保存失败') }
  finally { savingTask.value = false }
}

async function confirmTask(row) {
  await remindersApi.confirmTask(row.id)
  ElMessage.success('已确认回执')
  await loadTasks()
}

async function deleteTask(row) {
  await ElMessageBox.confirm('确认删除该提醒任务？', '删除', { type: 'warning' })
  await remindersApi.deleteTask(row.id)
  ElMessage.success('已删除')
  await loadTasks()
}

async function checkSecond() {
  const res = await remindersApi.checkSecond()
  ElMessage.success(`已检查，标记二次催办 ${res.secondReminded} 条`)
  await loadTasks()
}

// ===== 规则 =====
const rules      = ref([])
const ruleDialog = ref(false)
const isEditRule = ref(false)
const savingRule = ref(false)
const ruleFormRef = ref(null)
const ruleForm   = reactive({
  title: '', remindType: '', deadline: '', daysBefore: 30,
  remindLevel: '普通', deptId: null, isActive: true,
})
let editRuleId = null

async function loadRules() {
  rules.value = await remindersApi.listRules()
}

function openAddRule() {
  isEditRule.value = false; editRuleId = null
  Object.assign(ruleForm, { title: '', remindType: '', deadline: '', daysBefore: 30,
    remindLevel: '普通', deptId: null, isActive: true })
  ruleDialog.value = true
}

function openEditRule(row) {
  isEditRule.value = true; editRuleId = row.id
  Object.assign(ruleForm, { title: row.title, remindType: row.remindType || '',
    deadline: row.deadline || '', daysBefore: row.daysBefore || 30,
    remindLevel: row.remindLevel || '普通', deptId: row.deptId || null, isActive: row.isActive })
  ruleDialog.value = true
}

async function saveRule() {
  savingRule.value = true
  try {
    if (isEditRule.value) await remindersApi.updateRule(editRuleId, { ...ruleForm })
    else                  await remindersApi.createRule({ ...ruleForm })
    ruleDialog.value = false
    ElMessage.success('保存成功')
    await loadRules()
  } catch { ElMessage.error('保存失败') }
  finally { savingRule.value = false }
}

async function deleteRule(row) {
  await ElMessageBox.confirm('确认删除该规则？', '删除', { type: 'warning' })
  await remindersApi.deleteRule(row.id)
  ElMessage.success('已删除')
  await loadRules()
}

onMounted(() => { loadTasks(); loadRules() })

function onTabChange(tab) {
  if (tab === 'rules') loadRules()
  else loadTasks()
}
</script>

<template>
  <div class="rem-page">

    <!-- 统计卡 -->
    <div class="sum-bar" v-if="summary">
      <div class="sum-card"><span class="sn">{{ summary.pending }}</span><span class="sl">待确认</span></div>
      <div class="sum-card warn" v-if="summary.urgent"><span class="sn">{{ summary.urgent }}</span><span class="sl">紧急</span></div>
      <div class="sum-card danger" v-if="summary.overdue"><span class="sn">{{ summary.overdue }}</span><span class="sl">已逾期</span></div>
      <div class="sum-card info" v-if="summary.secondRemind"><span class="sn">{{ summary.secondRemind }}</span><span class="sl">二次催办</span></div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="onTabChange">

      <!-- 提醒任务 -->
      <el-tab-pane label="提醒任务" name="tasks">
        <div class="toolbar">
          <div class="toolbar-left">
            <el-input v-model="filter.keyword" placeholder="搜标题" clearable style="width:180px" @change="loadTasks" />
            <el-select v-model="filter.remindLevel" placeholder="紧急等级" clearable style="width:120px" @change="loadTasks">
              <el-option label="普通" value="普通" /><el-option label="重要" value="重要" /><el-option label="紧急" value="紧急" />
            </el-select>
            <el-select v-model="filter.isConfirm" placeholder="确认状态" clearable style="width:120px" @change="loadTasks">
              <el-option label="未确认" value="false" /><el-option label="已确认" value="true" />
            </el-select>
            <el-button size="small" @click="checkSecond">检查二次催办</el-button>
          </div>
          <el-button type="primary" @click="openAddTask">+ 新增提醒</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="tasks" v-loading="loading" border size="small" style="width:100%">
            <el-table-column label="紧急等级" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="LEVEL_TAG[row.remindLevel]" size="small">{{ row.remindLevel }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提醒标题" prop="title" min-width="200" show-overflow-tooltip />
            <el-table-column label="类型" prop="targetType" width="100" align="center" />
            <el-table-column label="提醒日期" prop="remindDate" width="110" align="center" />
            <el-table-column label="截止日期" prop="deadline" width="110" align="center" />
            <el-table-column label="责任人" prop="receiverName" width="100" align="center" />
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.secondRemindSent" type="danger" size="small">已二次催办</el-tag>
                <el-tag v-else-if="row.isConfirm" type="success" size="small">已确认</el-tag>
                <el-tag v-else type="warning" size="small">待确认</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link size="small" @click="openEditTask(row)">编辑</el-button>
                <el-button link size="small" type="success" v-if="!row.isConfirm" @click="confirmTask(row)">确认回执</el-button>
                <el-button link size="small" type="danger" @click="deleteTask(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 提醒规则 -->
      <el-tab-pane label="规则配置" name="rules">
        <div class="toolbar">
          <div class="toolbar-left"></div>
          <el-button type="primary" @click="openAddRule">+ 新增规则</el-button>
        </div>
        <div class="table-wrap">
          <el-table :data="rules" border size="small" style="width:100%">
            <el-table-column label="事项名称" prop="title" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" prop="remindType" width="120" align="center" />
            <el-table-column label="截止日" prop="deadline" width="110" align="center" />
            <el-table-column label="提前(天)" prop="daysBefore" width="90" align="center" />
            <el-table-column label="紧急等级" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="LEVEL_TAG[row.remindLevel]" size="small">{{ row.remindLevel }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="启用" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link size="small" @click="openEditRule(row)">编辑</el-button>
                <el-button link size="small" type="danger" @click="deleteRule(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 任务弹窗 -->
    <el-dialog v-model="taskDialog" :title="isEditTask ? '编辑提醒' : '新增提醒'" width="500px" destroy-on-close>
      <el-form :model="taskForm" ref="taskFormRef" label-width="80px"
               :rules="{ title: [{ required: true, message: '请填写标题' }] }">
        <el-form-item label="标题" prop="title"><el-input v-model="taskForm.title" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="类型">
              <el-select v-model="taskForm.targetType" clearable style="width:100%">
                <el-option label="项目申报" value="项目申报" /><el-option label="奖项申报" value="奖项申报" />
                <el-option label="专利年费" value="专利年费" /><el-option label="软著维护" value="软著维护" />
                <el-option label="成果转化后评估" value="成果转化后评估" /><el-option label="涉密成果核查" value="涉密成果核查" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急等级">
              <el-select v-model="taskForm.remindLevel" style="width:100%">
                <el-option label="普通" value="普通" /><el-option label="重要" value="重要" /><el-option label="紧急" value="紧急" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="提醒日期">
              <el-date-picker v-model="taskForm.remindDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期">
              <el-date-picker v-model="taskForm.deadline" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="责任人"><el-input v-model="taskForm.receiverName" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="taskForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingTask" @click="saveTask">保存</el-button>
      </template>
    </el-dialog>

    <!-- 规则弹窗 -->
    <el-dialog v-model="ruleDialog" :title="isEditRule ? '编辑规则' : '新增规则'" width="460px" destroy-on-close>
      <el-form :model="ruleForm" ref="ruleFormRef" label-width="90px"
               :rules="{ title: [{ required: true, message: '请填写名称' }] }">
        <el-form-item label="事项名称" prop="title"><el-input v-model="ruleForm.title" /></el-form-item>
        <el-form-item label="提醒类型">
          <el-select v-model="ruleForm.remindType" clearable style="width:100%">
            <el-option label="项目申报" value="项目申报" /><el-option label="奖项申报" value="奖项申报" />
            <el-option label="专利年费" value="专利年费" /><el-option label="软著维护" value="软著维护" />
            <el-option label="成果转化后评估" value="成果转化后评估" /><el-option label="涉密成果核查" value="涉密成果核查" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="截止日期">
              <el-date-picker v-model="ruleForm.deadline" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="提前(天)">
              <el-input-number v-model="ruleForm.daysBefore" :min="1" :max="365" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="紧急等级">
              <el-select v-model="ruleForm.remindLevel" style="width:100%">
                <el-option label="普通" value="普通" /><el-option label="重要" value="重要" /><el-option label="紧急" value="紧急" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用">
              <el-switch v-model="ruleForm.isActive" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingRule" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.rem-page { display: flex; flex-direction: column; gap: 12px; }
.sum-bar { display: flex; gap: 10px; }
.sum-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;
  padding: 10px 20px; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 80px; }
.sn { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.sl { font-size: 12px; color: var(--text-secondary); }
.sum-card.warn { border-color: #e6a23c; background: #fdf6ec; }
.sum-card.warn .sn { color: #e6a23c; }
.sum-card.danger { border-color: #f56c6c; background: #fef0f0; }
.sum-card.danger .sn { color: #f56c6c; }
.sum-card.info { border-color: #909399; background: #f4f4f5; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; }
.toolbar-left { display: flex; gap: 8px; }
.table-wrap { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
</style>
