<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import approvalsApi from '../api/approvals'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const isSysAdmin = computed(() => auth.user?.role === 'sys_admin')

const activeTab = ref('pending')
const loading = ref(false)

// ===== 待审列表 =====
const pendingList = ref([])
const pendingTotal = ref(0)
const pendingFilter = reactive({ page: 1, pageSize: 20 })

async function loadPending() {
  loading.value = true
  try {
    const res = await approvalsApi.myPending(pendingFilter)
    pendingList.value = res.items || res
    pendingTotal.value = res.total || 0
  } catch { ElMessage.error('加载待审列表失败') }
  finally { loading.value = false }
}

// ===== 已提交列表 =====
const submittedList = ref([])
const submittedTotal = ref(0)
const submittedFilter = reactive({ page: 1, pageSize: 20 })

const STATUS_TAG = {
  pending: { label: '待审', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' },
  cancelled: { label: '已取消', type: 'info' },
}

async function loadSubmitted() {
  loading.value = true
  try {
    const res = await approvalsApi.mySubmitted(submittedFilter)
    submittedList.value = res.items || res
    submittedTotal.value = res.total || 0
  } catch { ElMessage.error('加载提交列表失败') }
  finally { loading.value = false }
}

// ===== 审批弹窗 =====
const actionDialog = ref(false)
const actionType = ref('approve') // approve | reject | return
const actionForm = reactive({ opinion: '' })
const actionSaving = ref(false)
let actionInstance = null

function openAction(instance, type) {
  actionInstance = instance
  actionType.value = type
  actionForm.opinion = ''
  actionDialog.value = true
}

async function submitAction() {
  actionSaving.value = true
  try {
    const fn = {
      approve: () => approvalsApi.approve(actionInstance.id, { opinion: actionForm.opinion }),
      reject: () => approvalsApi.reject(actionInstance.id, { opinion: actionForm.opinion }),
      return: () => approvalsApi.return(actionInstance.id, { opinion: actionForm.opinion }),
    }[actionType.value]
    await fn()
    actionDialog.value = false
    ElMessage.success('操作成功')
    await loadPending()
  } catch { ElMessage.error('操作失败') }
  finally { actionSaving.value = false }
}

// ===== 流程管理 =====
const flows = ref([])
const flowLoading = ref(false)
const flowDialog = ref(false)
const isEditFlow = ref(false)
const savingFlow = ref(false)
const flowFormRef = ref(null)
const flowForm = reactive({
  name: '',
  businessType: '',
  description: '',
  isActive: true,
})
let editFlowId = null

const BIZ_TYPES = ['论文', '专利', '软著', '成果转化', '费用']

async function loadFlows() {
  flowLoading.value = true
  try {
    flows.value = await approvalsApi.listFlows()
  } catch { ElMessage.error('加载流程失败') }
  finally { flowLoading.value = false }
}

function openAddFlow() {
  isEditFlow.value = false
  editFlowId = null
  Object.assign(flowForm, { name: '', businessType: '', description: '', isActive: true })
  flowDialog.value = true
}

function openEditFlow(row) {
  isEditFlow.value = true
  editFlowId = row.id
  Object.assign(flowForm, {
    name: row.name,
    businessType: row.businessType || '',
    description: row.description || '',
    isActive: row.isActive,
  })
  flowDialog.value = true
}

async function saveFlow() {
  savingFlow.value = true
  try {
    if (isEditFlow.value) await approvalsApi.updateFlow(editFlowId, { ...flowForm })
    else await approvalsApi.createFlow({ ...flowForm })
    flowDialog.value = false
    ElMessage.success('保存成功')
    await loadFlows()
  } catch { ElMessage.error('保存失败') }
  finally { savingFlow.value = false }
}

async function deleteFlow(row) {
  await ElMessageBox.confirm(`确认删除流程「${row.name}」？`, '删除确认', { type: 'warning' })
  try {
    await approvalsApi.deleteFlow(row.id)
    ElMessage.success('已删除')
    await loadFlows()
  } catch { ElMessage.error('删除失败') }
}

// 展开的流程节点
const expandedFlowId = ref(null)
const flowNodes = ref([])

async function toggleExpand(flowId) {
  if (expandedFlowId.value === flowId) {
    expandedFlowId.value = null
    return
  }
  expandedFlowId.value = flowId
  try {
    const flow = await approvalsApi.getFlow(flowId)
    flowNodes.value = flow.nodes || []
  } catch { flowNodes.value = [] }
}

function onTabChange(tab) {
  if (tab === 'pending') loadPending()
  else if (tab === 'submitted') loadSubmitted()
  else if (tab === 'flows') loadFlows()
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(() => { loadPending(); loadSubmitted(); if (isSysAdmin.value) loadFlows() })
</script>

<template>
  <div class="approvals-page">
    <el-tabs v-model="activeTab" @tab-change="onTabChange">

      <!-- 我的待审 -->
      <el-tab-pane label="我的待审" name="pending">
        <div class="table-wrap">
          <el-table :data="pendingList" v-loading="loading" border size="small" style="width:100%">
            <el-table-column label="业务类型" prop="businessType" width="110" align="center" />
            <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
            <el-table-column label="提交人" prop="submitterName" width="100" align="center" />
            <el-table-column label="提交时间" width="160" align="center">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="当前节点" prop="currentNodeName" width="120" align="center" />
            <el-table-column label="操作" width="220" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link size="small" type="success" @click="openAction(row, 'approve')">通过</el-button>
                <el-button link size="small" type="danger" @click="openAction(row, 'reject')">驳回</el-button>
                <el-button link size="small" type="warning" @click="openAction(row, 'return')">退回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="pagination-wrap" v-if="pendingTotal > pendingFilter.pageSize">
          <el-pagination
            v-model:current-page="pendingFilter.page"
            :page-size="pendingFilter.pageSize"
            :total="pendingTotal"
            layout="prev, pager, next"
            @current-change="loadPending"
          />
        </div>
      </el-tab-pane>

      <!-- 我的提交 -->
      <el-tab-pane label="我的提交" name="submitted">
        <div class="table-wrap">
          <el-table :data="submittedList" v-loading="loading" border size="small" style="width:100%">
            <el-table-column label="业务类型" prop="businessType" width="110" align="center" />
            <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="STATUS_TAG[row.status]?.type" size="small">
                  {{ STATUS_TAG[row.status]?.label || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="160" align="center">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="审批意见" prop="opinion" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ row.opinion || '—' }}</template>
            </el-table-column>
          </el-table>
        </div>
        <div class="pagination-wrap" v-if="submittedTotal > submittedFilter.pageSize">
          <el-pagination
            v-model:current-page="submittedFilter.page"
            :page-size="submittedFilter.pageSize"
            :total="submittedTotal"
            layout="prev, pager, next"
            @current-change="loadSubmitted"
          />
        </div>
      </el-tab-pane>

      <!-- 流程管理 (admin) -->
      <el-tab-pane v-if="isSysAdmin" label="流程管理" name="flows">
        <div class="toolbar">
          <div class="spacer" />
          <el-button type="primary" @click="openAddFlow">+ 新增流程</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="flows" v-loading="flowLoading" border size="small" style="width:100%"
            row-key="id"
          >
            <el-table-column type="expand">
              <template #default="{ row }">
                <div style="padding: 12px 20px;">
                  <el-button
                    link
                    size="small"
                    type="primary"
                    @click="toggleExpand(row.id)"
                  >
                    {{ expandedFlowId === row.id ? '收起节点' : '查看节点' }}
                  </el-button>
                  <div v-if="expandedFlowId === row.id && flowNodes.length > 0" style="margin-top: 8px;">
                    <div v-for="(node, idx) in flowNodes" :key="idx" class="flow-node-item">
                      <el-tag size="small" type="info">{{ idx + 1 }}</el-tag>
                      <span>{{ node.name }}</span>
                      <span class="node-type">{{ node.approverType }}</span>
                    </div>
                  </div>
                  <div v-if="expandedFlowId === row.id && flowNodes.length === 0" style="margin-top:8px; color: var(--text-secondary); font-size: 13px;">
                    暂无节点配置
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="流程名称" prop="name" min-width="160" show-overflow-tooltip />
            <el-table-column label="业务类型" prop="businessType" width="120" align="center" />
            <el-table-column label="描述" prop="description" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.description || '—' }}</template>
            </el-table-column>
            <el-table-column label="启用" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link size="small" @click="openEditFlow(row)">编辑</el-button>
                <el-button link size="small" type="danger" @click="deleteFlow(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 审批操作弹窗 -->
    <el-dialog
      v-model="actionDialog"
      :title="actionType === 'approve' ? '通过审批' : actionType === 'reject' ? '驳回审批' : '退回审批'"
      width="480px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item label="审批意见">
          <el-input
            v-model="actionForm.opinion"
            type="textarea"
            :rows="4"
            :placeholder="actionType === 'approve' ? '可选填写通过意见' : '请填写驳回/退回原因'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialog = false">取消</el-button>
        <el-button
          :type="actionType === 'approve' ? 'success' : 'danger'"
          :loading="actionSaving"
          @click="submitAction"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 流程弹窗 -->
    <el-dialog
      v-model="flowDialog"
      :title="isEditFlow ? '编辑流程' : '新增流程'"
      width="520px"
      destroy-on-close
    >
      <el-form :model="flowForm" ref="flowFormRef" label-width="90px"
        :rules="{ name: [{ required: true, message: '请填写流程名称' }] }"
      >
        <el-form-item label="流程名称" prop="name">
          <el-input v-model="flowForm.name" placeholder="输入流程名称" />
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="flowForm.businessType" placeholder="选择业务类型" clearable style="width:100%">
            <el-option v-for="t in BIZ_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="flowForm.description" type="textarea" :rows="3" placeholder="流程说明" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="flowForm.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="flowDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingFlow" @click="saveFlow">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.approvals-page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.spacer { flex: 1; }
.table-wrap { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
.pagination-wrap { display: flex; justify-content: center; padding: 8px 0; }
.flow-node-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid var(--border-color);
  font-size: 13px; color: var(--text-primary);
}
.flow-node-item:last-child { border-bottom: none; }
.node-type { color: var(--text-secondary); font-size: 12px; }
</style>
