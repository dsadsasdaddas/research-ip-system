<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { attachmentsApi } from '../api/attachments'

const props = defineProps({
  relationType: { type: String, required: true },
  relationId:   { type: Number, required: true },
})

const list    = ref([])
const loading = ref(false)
const uploading = ref(false)

async function loadList() {
  if (!props.relationId) return
  loading.value = true
  try {
    list.value = await attachmentsApi.list(props.relationType, props.relationId)
  } finally { loading.value = false }
}

watch(() => props.relationId, loadList)
onMounted(loadList)

async function handleUpload(file) {
  uploading.value = true
  try {
    await attachmentsApi.upload(file.raw, props.relationType, props.relationId)
    ElMessage.success('上传成功')
    await loadList()
  } catch { ElMessage.error('上传失败') }
  finally { uploading.value = false }
  return false // 阻止 el-upload 自动上传
}

async function remove(item) {
  await ElMessageBox.confirm(`确认删除附件 ${item.originalName}？`, '删除', { type: 'warning' })
  await attachmentsApi.remove(item.id)
  ElMessage.success('已删除')
  await loadList()
}

function downloadUrl(id) {
  return `/api/attachments/${id}/download`
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
</script>

<template>
  <div class="att-panel">
    <div class="att-header">
      <span class="att-title">附件（{{ list.length }}）</span>
      <el-upload
        :show-file-list="false"
        :before-upload="() => false"
        :on-change="handleUpload"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
      >
        <el-button size="small" :loading="uploading">上传附件</el-button>
      </el-upload>
    </div>

    <div class="att-empty" v-if="!loading && list.length === 0">暂无附件</div>

    <div class="att-list" v-loading="loading">
      <div v-for="item in list" :key="item.id" class="att-item">
        <div class="att-info">
          <span class="att-name">{{ item.originalName }}</span>
          <span class="att-meta">v{{ item.version }} · {{ formatSize(item.fileSize) }} · {{ item.uploadUser }}</span>
        </div>
        <div class="att-actions">
          <a :href="downloadUrl(item.id)" target="_blank">
            <el-button link size="small" type="primary">下载</el-button>
          </a>
          <el-button link size="small" type="danger" @click="remove(item)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.att-panel { border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
.att-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--bg-muted); border-bottom: 1px solid var(--border-color);
}
.att-title { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.att-empty { padding: 20px; text-align: center; font-size: 13px; color: var(--text-secondary); }
.att-list { display: flex; flex-direction: column; }
.att-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid var(--border-color);
}
.att-item:last-child { border-bottom: none; }
.att-info { display: flex; flex-direction: column; gap: 2px; }
.att-name { font-size: 13px; color: var(--text-primary); }
.att-meta { font-size: 11px; color: var(--text-secondary); }
.att-actions { display: flex; gap: 4px; }
</style>
