<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { auditLogsApi } from '../api/auditLogs'

const loading = ref(false)
const items   = ref([])
const total   = ref(0)
const filter  = reactive({ keyword: '', module: '', action: '', username: '' })
const page    = ref(1)
const pageSize = 50

const MODULE_LABELS = {
  papers: '论文', patents: '专利', copyrights: '软著', transforms: '转化',
  fees: '费用', reminders: '提醒', attachments: '附件', users: '用户', departments: '部门',
}
const ACTION_LABELS = { create: '新增', update: '编辑', delete: '删除' }

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize }
    if (filter.keyword)  params.keyword  = filter.keyword
    if (filter.module)   params.module   = filter.module
    if (filter.action)   params.action   = filter.action
    if (filter.username) params.username = filter.username
    const res = await auditLogsApi.list(params)
    items.value = res.items
    total.value = res.total
  } catch { ElMessage.error('加载失败（可能权限不足）') }
  finally { loading.value = false }
}

onMounted(load)

function onPageChange(p) { page.value = p; load() }
</script>

<template>
  <div class="log-page">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input v-model="filter.username" placeholder="操作人" clearable style="width:130px" @change="load" />
        <el-select v-model="filter.module" placeholder="模块" clearable style="width:110px" @change="load">
          <el-option v-for="(label, val) in MODULE_LABELS" :key="val" :label="label" :value="val" />
        </el-select>
        <el-select v-model="filter.action" placeholder="操作" clearable style="width:100px" @change="load">
          <el-option label="新增" value="create" /><el-option label="编辑" value="update" /><el-option label="删除" value="delete" />
        </el-select>
        <el-input v-model="filter.keyword" placeholder="搜路径/内容" clearable style="width:180px" @change="load" />
      </div>
    </div>

    <div class="table-wrap">
      <el-table :data="items" v-loading="loading" border size="small" style="width:100%">
        <el-table-column label="时间" prop="createTime" width="160" align="center">
          <template #default="{ row }">{{ new Date(row.createTime).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作人" prop="username" width="100" align="center" />
        <el-table-column label="模块" width="80" align="center">
          <template #default="{ row }">{{ MODULE_LABELS[row.module] || row.module }}</template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.action === 'delete' ? 'danger' : row.action === 'create' ? 'success' : 'warning'" size="small">
              {{ ACTION_LABELS[row.action] || row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="方法" prop="method" width="80" align="center" />
        <el-table-column label="路径" prop="path" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态码" prop="statusCode" width="80" align="center" />
        <el-table-column label="IP" prop="ip" width="130" align="center" />
      </el-table>
    </div>

    <el-pagination
      v-if="total > pageSize"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="onPageChange"
      style="margin-top: 12px; justify-content: flex-end; display: flex"
    />
  </div>
</template>

<style scoped>
.log-page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.toolbar-left { display: flex; gap: 8px; }
.table-wrap { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
</style>
