<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import rbacApi from '../api/rbac'

const loading = ref(false)
const roles = ref([])
const permissions = ref([])
const selectedRoleCode = ref('')
const checkedPermCodes = ref([])
const saving = ref(false)

// ===== 新增角色 =====
const roleDialog = ref(false)
const roleFormRef = ref(null)
const roleForm = reactive({ code: '', name: '', description: '' })

async function loadRoles() {
  try {
    roles.value = await rbacApi.listRoles()
  } catch { ElMessage.error('加载角色失败') }
}

async function loadPermissions() {
  try {
    permissions.value = await rbacApi.listPermissions()
  } catch { ElMessage.error('加载权限列表失败') }
}

async function loadRolePermissions() {
  if (!selectedRoleCode.value) { checkedPermCodes.value = []; return }
  try {
    const codes = await rbacApi.getRolePermissions(selectedRoleCode.value)
    checkedPermCodes.value = codes || []
  } catch { checkedPermCodes.value = [] }
}

// 按模块分组权限:将 permission 的 module 字段提取为分组
const groupedPermissions = computed(() => {
  const groups = {}
  for (const p of permissions.value) {
    const mod = p.module || '通用'
    if (!groups[mod]) groups[mod] = []
    groups[mod].push(p)
  }
  return groups
})

function isPermChecked(code) {
  return checkedPermCodes.value.includes(code)
}

function togglePerm(code) {
  const idx = checkedPermCodes.value.indexOf(code)
  if (idx >= 0) checkedPermCodes.value.splice(idx, 1)
  else checkedPermCodes.value.push(code)
}

function isModuleAllChecked(modulePerms) {
  return modulePerms.every((p) => checkedPermCodes.value.includes(p.code))
}

function toggleModule(modulePerms) {
  const allChecked = isModuleAllChecked(modulePerms)
  if (allChecked) {
    // 取消全选
    for (const p of modulePerms) {
      const idx = checkedPermCodes.value.indexOf(p.code)
      if (idx >= 0) checkedPermCodes.value.splice(idx, 1)
    }
  } else {
    // 全选
    for (const p of modulePerms) {
      if (!checkedPermCodes.value.includes(p.code)) {
        checkedPermCodes.value.push(p.code)
      }
    }
  }
}

async function savePermissions() {
  if (!selectedRoleCode.value) return
  saving.value = true
  try {
    await rbacApi.assignPermissions(selectedRoleCode.value, [...checkedPermCodes.value])
    ElMessage.success('权限已保存')
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

function openAddRole() {
  Object.assign(roleForm, { code: '', name: '', description: '' })
  roleDialog.value = true
}

async function saveRole() {
  try {
    await rbacApi.createRole({ ...roleForm })
    roleDialog.value = false
    ElMessage.success('角色已创建')
    await loadRoles()
  } catch { ElMessage.error('创建失败') }
}

function selectRole(code) {
  selectedRoleCode.value = code
}

watch(selectedRoleCode, loadRolePermissions)

onMounted(() => { loadRoles(); loadPermissions() })
</script>

<template>
  <div class="rbac-page">
    <div class="rbac-layout">
      <!-- 左侧：角色列表 -->
      <div class="role-panel app-card">
        <div class="panel-header">
          <span class="panel-title">角色列表</span>
          <el-button size="small" type="primary" @click="openAddRole">+ 新增</el-button>
        </div>
        <div class="role-list">
          <div
            v-for="role in roles"
            :key="role.code"
            class="role-item"
            :class="{ active: selectedRoleCode === role.code }"
            @click="selectRole(role.code)"
          >
            <div class="role-name">{{ role.name }}</div>
            <div class="role-code">{{ role.code }}</div>
          </div>
          <div v-if="roles.length === 0" class="empty-hint">暂无角色</div>
        </div>
      </div>

      <!-- 右侧：权限矩阵 -->
      <div class="perm-panel app-card">
        <div class="panel-header">
          <span class="panel-title">
            {{ selectedRoleCode ? `权限配置 — ${selectedRoleCode}` : '请选择角色' }}
          </span>
          <el-button
            type="primary"
            size="small"
            :loading="saving"
            :disabled="!selectedRoleCode"
            @click="savePermissions"
          >
            保存权限
          </el-button>
        </div>

        <div v-if="!selectedRoleCode" class="empty-hint" style="padding: 60px 0; text-align: center;">
          请在左侧选择一个角色
        </div>

        <div v-else class="perm-matrix" v-loading="loading">
          <div v-for="(mods, moduleName) in groupedPermissions" :key="moduleName" class="perm-group">
            <div class="group-header">
              <el-checkbox
                :model-value="isModuleAllChecked(mods)"
                @change="toggleModule(mods)"
              >
                <span class="group-name">{{ moduleName }}</span>
              </el-checkbox>
            </div>
            <div class="group-items">
              <el-checkbox
                v-for="p in mods"
                :key="p.code"
                :model-value="isPermChecked(p.code)"
                @change="togglePerm(p.code)"
              >
                {{ p.action || p.name }}
              </el-checkbox>
            </div>
          </div>
          <div v-if="Object.keys(groupedPermissions).length === 0" class="empty-hint">
            暂无可配置的权限
          </div>
        </div>
      </div>
    </div>

    <!-- 新增角色弹窗 -->
    <el-dialog v-model="roleDialog" title="新增角色" width="440px" destroy-on-close>
      <el-form :model="roleForm" ref="roleFormRef" label-width="80px"
        :rules="{
          code: [{ required: true, message: '请填写角色编码' }],
          name: [{ required: true, message: '请填写角色名称' }],
        }"
      >
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="roleForm.code" placeholder="如: dept_admin" />
        </el-form-item>
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="如: 部门管理员" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.rbac-page { display: flex; flex-direction: column; gap: 12px; }
.rbac-layout { display: flex; gap: 12px; min-height: 500px; }
.role-panel { width: 260px; display: flex; flex-direction: column; flex-shrink: 0; }
.perm-panel { flex: 1; display: flex; flex-direction: column; }
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid var(--border-color);
}
.panel-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.role-list { flex: 1; overflow-y: auto; }
.role-item {
  padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}
.role-item:hover { background: var(--bg-muted); }
.role-item.active { background: var(--el-color-primary-light-9); border-left: 3px solid var(--el-color-primary); }
.role-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.role-code { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.empty-hint { padding: 20px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.perm-matrix { flex: 1; overflow-y: auto; padding: 12px 16px; }
.perm-group { margin-bottom: 16px; }
.perm-group:last-child { margin-bottom: 0; }
.group-header { margin-bottom: 8px; }
.group-name { font-weight: 600; color: var(--text-primary); }
.group-items { display: flex; flex-wrap: wrap; gap: 4px 16px; padding-left: 24px; }
</style>
