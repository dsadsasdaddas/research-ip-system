<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import backupApi from '../api/backup'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const filter = reactive({ page: 1, pageSize: 20 })
const triggering = ref(false)

const STATUS_TAG = {
  pending: { label: '进行中', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  restoring: { label: '恢复中', type: 'warning' },
}

async function loadList() {
  loading.value = true
  try {
    const res = await backupApi.listLogs(filter)
    list.value = res.items || res
    total.value = res.total || 0
  } catch { ElMessage.error('加载备份记录失败') }
  finally { loading.value = false }
}

async function triggerBackup() {
  triggering.value = true
  try {
    await backupApi.trigger()
    ElMessage.success('备份任务已触发')
    await loadList()
  } catch { ElMessage.error('触发备份失败') }
  finally { triggering.value = false }
}

async function restoreBackup(row) {
  try {
    await ElMessageBox.confirm(
      `确认要从此备份恢复数据？此操作将覆盖当前数据。`,
      '恢复确认',
      { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' },
    )
  } catch { return }
  try {
    await backupApi.restore(row.id)
    ElMessage.success('恢复任务已提交')
    await loadList()
  } catch { ElMessage.error('恢复失败') }
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(loadList)
</script>

<template>
  <div class="backup-page">
    <div class="toolbar app-card">
      <div class="section-title">备份管理</div>
      <div class="spacer" />
      <el-button type="primary" :loading="triggering" @click="triggerBackup">手动备份</el-button>
    </div>

    <div class="table-wrap app-card">
      <el-table :data="list" v-loading="loading" border size="small" style="width:100%">
        <el-table-column label="类型" prop="type" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type === 'manual' ? '手动备份' : row.type === 'auto' ? '自动备份' : row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="文件路径" prop="filePath" min-width="240" show-overflow-tooltip />
        <el-table-column label="大小" width="100" align="right">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="STATUS_TAG[row.status]?.type" size="small">
              {{ STATUS_TAG[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备份时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作人" prop="operatorName" width="100" align="center" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'completed'"
              link
              size="small"
              type="warning"
              @click="restoreBackup(row)"
            >
              恢复
            </el-button>
            <span v-else style="color: var(--text-secondary); font-size: 12px">—</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-wrap" v-if="total > filter.pageSize">
      <el-pagination
        v-model:current-page="filter.page"
        :page-size="filter.pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadList"
      />
    </div>
  </div>
</template>

<style scoped>
.backup-page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; }
.section-title { color: var(--text-primary); font-size: 15px; font-weight: 600; }
.spacer { flex: 1; }
.table-wrap { padding: 4px; }
.table-wrap :deep(th.el-table__cell) { background: var(--bg-muted); color: var(--text-regular); font-weight: 600; }
.pagination-wrap { display: flex; justify-content: center; padding: 8px 0; }
</style>
