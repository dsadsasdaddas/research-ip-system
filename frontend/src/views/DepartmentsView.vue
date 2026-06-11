<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search as SearchIcon } from '@element-plus/icons-vue'
import { departmentsApi } from '../api/departments'

const departments = ref([])
const loading = ref(false)
const keyword = ref('')
const dialogVisible = ref(false)
const editingId = ref(null)

const form = reactive({ name: '', parentId: null, description: '' })

function parentName(id) {
  const dept = departments.value.find((d) => d.id === id)
  return dept?.name || '-'
}

function resetForm(row) {
  editingId.value = row?.id || null
  form.name = row?.name || ''
  form.parentId = row?.parentId ?? null
  form.description = row?.description || ''
}

async function load() {
  loading.value = true
  try {
    departments.value = await departmentsApi.list(keyword.value)
  } catch (err) {
    ElMessage.error(err.message || '加载部门失败')
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

async function save() {
  if (!form.name) {
    ElMessage.warning('请填写部门名称')
    return
  }
  const payload = {
    name: form.name,
    parentId: form.parentId || null,
    description: form.description || null,
  }
  try {
    if (editingId.value) await departmentsApi.update(editingId.value, payload)
    else await departmentsApi.create(payload)
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除部门「${row.name}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await departmentsApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="departments-page">
    <div class="toolbar app-card">
      <el-input
        v-model="keyword"
        placeholder="按部门名称搜索"
        clearable
        :prefix-icon="SearchIcon"
        style="width:260px"
        @keyup.enter="load"
        @clear="load"
      />
      <el-button @click="load">搜索</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">新增部门</el-button>
    </div>

    <div class="table-wrap app-card">
      <el-table :data="departments" v-loading="loading" border size="small" style="width:100%">
        <el-table-column label="ID" prop="id" width="80" align="center" />
        <el-table-column label="部门名称" prop="name" min-width="180" />
        <el-table-column label="上级部门" width="180">
          <template #default="{ row }">{{ parentName(row.parentId) }}</template>
        </el-table-column>
        <el-table-column label="备注" prop="description" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑部门' : '新增部门'" width="560px">
      <el-form label-width="90px">
        <el-form-item label="部门名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="上级部门">
          <el-select v-model="form.parentId" clearable style="width:100%" placeholder="顶级部门可留空">
            <el-option
              v-for="dept in departments.filter((d) => d.id !== editingId)"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.departments-page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; }
.spacer { flex: 1; }
.table-wrap { padding: 4px; }
.table-wrap :deep(th.el-table__cell) { background: var(--bg-muted); color: var(--text-regular); font-weight: 600; }
</style>
