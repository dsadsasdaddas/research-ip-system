<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { integrationsApi } from '../api/integrations'

const TYPE_LABELS = {
  crossref: 'Crossref DOI/论文',
  scopus: 'Scopus 论文',
  openalex: 'OpenAlex 论文',
  cnipa: 'CNIPA 专利状态',
  hr_ldap: 'HR/LDAP 人员部门',
  finance: '财务系统',
  email: '邮件通知',
  sms: '短信通知',
}

const configs = ref([])
const logs = ref([])
const total = ref(0)
const loading = ref(false)
const testingId = ref(null)
const logLoading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const page = ref(1)
const pageSize = 20

const form = reactive({
  type: 'crossref',
  name: '',
  baseUrl: '',
  apiKeyEnv: '',
  isEnabled: false,
  timeoutMs: 8000,
  retryCount: 3,
  fallbackMode: 'manual',
  extra: '',
})

const logFilter = reactive({ type: '', success: '' })

function normalizePayload() {
  return {
    type: form.type,
    name: form.name,
    baseUrl: form.baseUrl || null,
    apiKeyEnv: form.apiKeyEnv || null,
    isEnabled: form.isEnabled,
    timeoutMs: Number(form.timeoutMs),
    retryCount: Number(form.retryCount),
    fallbackMode: form.fallbackMode || 'manual',
    extra: form.extra || null,
  }
}

function fillForm(row) {
  editingId.value = row?.id || null
  form.type = row?.type || 'crossref'
  form.name = row?.name || ''
  form.baseUrl = row?.baseUrl || ''
  form.apiKeyEnv = row?.apiKeyEnv || ''
  form.isEnabled = Boolean(row?.isEnabled)
  form.timeoutMs = row?.timeoutMs || 8000
  form.retryCount = row?.retryCount ?? 3
  form.fallbackMode = row?.fallbackMode || 'manual'
  form.extra = row?.extra || ''
}

async function loadConfigs() {
  loading.value = true
  try {
    configs.value = await integrationsApi.listConfigs()
  } catch (err) {
    ElMessage.error(err.message || '加载接口配置失败')
  } finally {
    loading.value = false
  }
}

async function loadLogs() {
  logLoading.value = true
  try {
    const params = { page: page.value, pageSize }
    if (logFilter.type) params.type = logFilter.type
    if (logFilter.success !== '') params.success = logFilter.success
    const res = await integrationsApi.listLogs(params)
    logs.value = res.items
    total.value = res.total
  } catch (err) {
    ElMessage.error(err.message || '加载接口日志失败')
  } finally {
    logLoading.value = false
  }
}

function openCreate() {
  fillForm(null)
  dialogVisible.value = true
}

function openEdit(row) {
  fillForm(row)
  dialogVisible.value = true
}

async function saveConfig() {
  if (!form.name) {
    ElMessage.warning('请填写接口名称')
    return
  }
  try {
    const payload = normalizePayload()
    if (editingId.value) await integrationsApi.updateConfig(editingId.value, payload)
    else await integrationsApi.createConfig(payload)
    ElMessage.success('已保存')
    dialogVisible.value = false
    await loadConfigs()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function testConfig(row) {
  testingId.value = row.id
  try {
    const res = await integrationsApi.testConfig(row.id)
    if (res.success) ElMessage.success(`${res.message} · ${res.elapsedMs}ms`)
    else ElMessage.warning(`${res.message} · ${res.elapsedMs}ms`)
    await loadLogs()
  } catch (err) {
    ElMessage.error(err.message || '测试失败')
  } finally {
    testingId.value = null
  }
}

function onLogPageChange(p) {
  page.value = p
  loadLogs()
}

function onFilterChange() {
  page.value = 1
  loadLogs()
}

onMounted(async () => {
  await loadConfigs()
  await loadLogs()
})
</script>

<template>
  <div class="integrations-page">
    <div class="summary-card">
      <div>
        <div class="summary-title">外部接口配置中心</div>
        <div class="summary-text">
          统一管理 Crossref / Scopus / OpenAlex / CNIPA / HR-LDAP / 财务 / 邮件 / 短信的开关、地址、超时、重试和降级策略。
        </div>
      </div>
      <el-button type="primary" @click="openCreate">新增接口</el-button>
    </div>

    <div class="table-wrap">
      <el-table :data="configs" v-loading="loading" border size="small" style="width:100%">
        <el-table-column label="类型" width="150">
          <template #default="{ row }">{{ TYPE_LABELS[row.type] || row.type }}</template>
        </el-table-column>
        <el-table-column label="名称" prop="name" min-width="160" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
              {{ row.isEnabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Base URL" prop="baseUrl" min-width="220" show-overflow-tooltip />
        <el-table-column label="密钥环境变量" prop="apiKeyEnv" width="150" show-overflow-tooltip />
        <el-table-column label="超时/重试" width="110" align="center">
          <template #default="{ row }">{{ row.timeoutMs }}ms / {{ row.retryCount }}</template>
        </el-table-column>
        <el-table-column label="降级" prop="fallbackMode" width="90" align="center" />
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" :loading="testingId === row.id" @click="testConfig(row)">测试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="logs-card">
      <div class="logs-head">
        <div class="section-title">调用 / 测试日志</div>
        <div class="filters">
          <el-select v-model="logFilter.type" placeholder="接口类型" clearable style="width:180px" @change="onFilterChange">
            <el-option v-for="(label, val) in TYPE_LABELS" :key="val" :label="label" :value="val" />
          </el-select>
          <el-select v-model="logFilter.success" placeholder="结果" clearable style="width:120px" @change="onFilterChange">
            <el-option label="成功" value="true" />
            <el-option label="失败" value="false" />
          </el-select>
        </div>
      </div>

      <el-table :data="logs" v-loading="logLoading" border size="small" style="width:100%">
        <el-table-column label="时间" prop="createTime" width="160" align="center">
          <template #default="{ row }">{{ new Date(row.createTime).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="类型" width="130">
          <template #default="{ row }">{{ TYPE_LABELS[row.type] || row.type }}</template>
        </el-table-column>
        <el-table-column label="动作" prop="action" width="100" />
        <el-table-column label="结果" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small">{{ row.success ? '成功' : '失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态码" prop="statusCode" width="80" align="center" />
        <el-table-column label="耗时" width="90" align="center">
          <template #default="{ row }">{{ row.elapsedMs ?? '-' }}ms</template>
        </el-table-column>
        <el-table-column label="降级" width="80" align="center">
          <template #default="{ row }">{{ row.fallbackUsed ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="错误" prop="errorMessage" min-width="220" show-overflow-tooltip />
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="onLogPageChange"
        class="pager"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑接口配置' : '新增接口配置'" width="620px">
      <el-form label-width="110px" class="config-form">
        <el-form-item label="接口类型">
          <el-select v-model="form.type" :disabled="Boolean(editingId)" style="width:100%">
            <el-option v-for="(label, val) in TYPE_LABELS" :key="val" :label="label" :value="val" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="Base URL"><el-input v-model="form.baseUrl" placeholder="例如 https://api.crossref.org" /></el-form-item>
        <el-form-item label="密钥环境变量"><el-input v-model="form.apiKeyEnv" placeholder="例如 SCOPUS_API_KEY，不能填写真实密钥" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.isEnabled" /></el-form-item>
        <el-form-item label="超时时间"><el-input-number v-model="form.timeoutMs" :min="1000" :max="60000" :step="1000" style="width:160px" /> ms</el-form-item>
        <el-form-item label="重试次数"><el-input-number v-model="form.retryCount" :min="0" :max="5" style="width:160px" /></el-form-item>
        <el-form-item label="降级模式">
          <el-select v-model="form.fallbackMode" style="width:180px">
            <el-option label="人工处理 manual" value="manual" />
            <el-option label="模拟 mock" value="mock" />
            <el-option label="禁用 disabled" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="扩展 JSON"><el-input v-model="form.extra" type="textarea" :rows="3" placeholder="可空，不能保存敏感密钥" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.integrations-page { display: flex; flex-direction: column; gap: 12px; }
.summary-card, .logs-card, .table-wrap { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; }
.summary-card { display: flex; justify-content: space-between; align-items: center; padding: 16px; }
.summary-title, .section-title { color: var(--text-primary); font-size: 15px; font-weight: 600; }
.summary-text { margin-top: 6px; color: var(--text-regular); font-size: 13px; }
.table-wrap { overflow: hidden; }
.logs-card { padding: 12px; }
.logs-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.filters { display: flex; gap: 8px; }
.config-form { padding-right: 12px; }
.pager { margin-top: 12px; justify-content: flex-end; display: flex; }
</style>
