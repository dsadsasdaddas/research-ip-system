<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import notificationsApi from '../api/notifications'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const activeTab = ref('all')

const filter = reactive({ page: 1, pageSize: 15 })

const TYPE_TAG = {
  system: { label: '系统', type: 'info' },
  reminder: { label: '提醒', type: 'warning' },
  approval: { label: '审批', type: 'success' },
  report: { label: '报表', type: '' },
}

const filteredList = computed(() => {
  if (activeTab.value === 'unread') return list.value.filter((n) => !n.isRead)
  return list.value
})

async function loadList() {
  loading.value = true
  try {
    const res = await notificationsApi.list(filter)
    list.value = res.items || res
    total.value = res.total || (Array.isArray(res) ? res.length : 0)
  } catch (e) {
    ElMessage.error('加载通知失败')
  } finally {
    loading.value = false
  }
}

async function markRead(item) {
  try {
    await notificationsApi.markRead(item.id)
    item.isRead = true
  } catch {
    ElMessage.error('标记失败')
  }
}

async function markAllRead() {
  try {
    await notificationsApi.markAllRead()
    list.value.forEach((n) => { n.isRead = true })
    ElMessage.success('已全部标记为已读')
  } catch {
    ElMessage.error('操作失败')
  }
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(loadList)
</script>

<template>
  <div class="notif-page">
    <div class="toolbar app-card">
      <el-tabs v-model="activeTab" class="notif-tabs">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="未读" name="unread" />
      </el-tabs>
      <div class="spacer" />
      <el-button size="small" @click="markAllRead">全部标记已读</el-button>
    </div>

    <div class="notif-list" v-loading="loading">
      <div v-if="!loading && filteredList.length === 0" class="empty">
        暂无通知
      </div>

      <div
        v-for="item in filteredList"
        :key="item.id"
        class="notif-card app-card"
        :class="{ unread: !item.isRead }"
      >
        <div class="notif-header">
          <el-tag
            :type="TYPE_TAG[item.messageType]?.type || 'info'"
            size="small"
          >
            {{ TYPE_TAG[item.messageType]?.label || item.messageType }}
          </el-tag>
          <span class="notif-title">{{ item.title }}</span>
          <span class="notif-time">{{ formatTime(item.createTime) }}</span>
        </div>
        <div class="notif-body">{{ item.content }}</div>
        <div class="notif-footer">
          <el-button
            v-if="!item.isRead"
            link
            size="small"
            type="primary"
            @click="markRead(item)"
          >
            标记已读
          </el-button>
        </div>
      </div>
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
.notif-page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 4px 16px; }
.notif-tabs { flex: 0; }
.notif-tabs :deep(.el-tabs__header) { margin-bottom: 0; }
.spacer { flex: 1; }
.notif-list { display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.notif-card { padding: 14px 16px; transition: border-color 0.15s; }
.notif-card.unread { border-left: 3px solid var(--el-color-primary); }
.notif-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.notif-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.notif-time { margin-left: auto; font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
.notif-body { font-size: 13px; color: var(--text-regular); line-height: 1.5; }
.notif-footer { margin-top: 6px; display: flex; justify-content: flex-end; }
.empty { text-align: center; color: var(--text-secondary); padding: 60px 0; font-size: 14px; }
.pagination-wrap { display: flex; justify-content: center; padding: 8px 0; }
</style>
