<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usersApi } from '../api/users'
import { departmentsApi } from '../api/departments'

const ROLE_LABELS = {
  researcher: '科研人员',
  dept_secretary: '部门秘书',
  dept_admin: '部门管理员',
  leader: '院领导',
  secret_admin: '涉密管理员',
  auditor: '审计员',
  sys_admin: '系统管理员',
}

const users = ref([])
const departments = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)

const form = reactive({
  username: '',
  password: '',
  realName: '',
  email: '',
  role: 'researcher',
  deptId: null,
  isActive: true,
})

function deptName(id) {
  const dept = departments.value.find((d) => d.id === id)
  return dept?.name || '-'
}

function resetForm(row) {
  editingId.value = row?.id || null
  form.username = row?.username || ''
  form.password = ''
  form.realName = row?.realName || ''
  form.email = row?.email || ''
  form.role = row?.role || 'researcher'
  form.deptId = row?.deptId ?? null
  form.isActive = row?.isActive ?? true
}

async function load() {
  loading.value = true
  try {
    const [userRows, deptRows] = await Promise.all([usersApi.list(), departmentsApi.list()])
    users.value = userRows
    departments.value = deptRows
  } catch (err) {
    ElMessage.error(err.message || '加载用户失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm(null)
  dialogVisible.value = true
}

function openEdit(row) {
  resetForm(row)
  dialogVisible.value = true
}

function buildPayload() {
  const payload = {
    realName: form.realName || null,
    email: form.email || null,
    role: form.role,
    deptId: form.deptId || null,
    isActive: form.isActive,
  }
  if (!editingId.value) {
    payload.username = form.username
    payload.password = form.password
  } else if (form.password) {
    payload.password = form.password
  }
  return payload
}

async function save() {
  if (!editingId.value && (!form.username || !form.password)) {
    ElMessage.warning('新增用户必须填写用户名和密码')
    return
  }
  try {
    const payload = buildPayload()
    if (editingId.value) await usersApi.update(editingId.value, payload)
    else await usersApi.create(payload)
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await usersApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="users-page">
    <div class="toolbar app-card">
      <div class="section-title">用户管理</div>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">新增用户</el-button>
    </div>

    <div class="table-wrap app-card">
      <el-table :data="users" v-loading="loading" border size="small" style="width:100%">
        <el-table-column label="用户名" prop="username" width="130" />
        <el-table-column label="姓名" prop="realName" width="130" />
        <el-table-column label="角色" width="140">
          <template #default="{ row }">{{ ROLE_LABELS[row.role] || row.role }}</template>
        </el-table-column>
        <el-table-column label="部门" width="160">
          <template #default="{ row }">{{ deptName(row.deptId) }}</template>
        </el-table-column>
        <el-table-column label="邮箱" prop="email" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160" align="center">
          <template #default="{ row }">{{ new Date(row.createTime).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.username === 'admin'" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑用户' : '新增用户'" width="620px">
      <el-form label-width="100px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="Boolean(editingId)" />
        </el-form-item>
        <el-form-item :label="editingId ? '新密码' : '密码'" :required="!editingId">
          <el-input v-model="form.password" type="password" show-password :placeholder="editingId ? '不填则不修改密码' : '至少 6 位'" />
        </el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.realName" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option v-for="(label, val) in ROLE_LABELS" :key="val" :label="label" :value="val" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="form.deptId" clearable style="width:100%" placeholder="全院/无部门可留空">
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.isActive" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; }
.section-title { color: var(--text-primary); font-size: 15px; font-weight: 600; }
.spacer { flex: 1; }
.table-wrap { padding: 4px; }
.table-wrap :deep(th.el-table__cell) { background: var(--bg-muted); color: var(--text-regular); font-weight: 600; }
</style>
