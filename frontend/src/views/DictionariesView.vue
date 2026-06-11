<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dictionariesApi } from '../api/dictionaries'

const types = ref([])
const items = ref([])
const selectedType = ref('')
const loadingTypes = ref(false)
const loadingItems = ref(false)
const typeDialogVisible = ref(false)
const itemDialogVisible = ref(false)
const editingTypeId = ref(null)
const editingItemId = ref(null)

const typeForm = reactive({ code: '', name: '', scope: 'business', isSystem: false, isActive: true, remark: '' })
const itemForm = reactive({ typeCode: '', label: '', value: '', sortOrder: 0, color: '', isDefault: false, isSystem: false, isActive: true, remark: '' })

const currentTypeName = computed(() => types.value.find((t) => t.code === selectedType.value)?.name || selectedType.value)

function resetTypeForm(row) {
  editingTypeId.value = row?.id || null
  typeForm.code = row?.code || ''
  typeForm.name = row?.name || ''
  typeForm.scope = row?.scope || 'business'
  typeForm.isSystem = row?.isSystem ?? false
  typeForm.isActive = row?.isActive ?? true
  typeForm.remark = row?.remark || ''
}

function resetItemForm(row) {
  editingItemId.value = row?.id || null
  itemForm.typeCode = row?.typeCode || selectedType.value || ''
  itemForm.label = row?.label || ''
  itemForm.value = row?.value || ''
  itemForm.sortOrder = row?.sortOrder ?? 0
  itemForm.color = row?.color || ''
  itemForm.isDefault = row?.isDefault ?? false
  itemForm.isSystem = row?.isSystem ?? false
  itemForm.isActive = row?.isActive ?? true
  itemForm.remark = row?.remark || ''
}

async function loadTypes() {
  loadingTypes.value = true
  try {
    types.value = await dictionariesApi.listTypes()
    if (!selectedType.value && types.value.length > 0) selectedType.value = types.value[0].code
  } catch (err) {
    ElMessage.error(err.message || '加载字典类型失败')
  } finally {
    loadingTypes.value = false
  }
}

async function loadItems() {
  if (!selectedType.value) {
    items.value = []
    return
  }
  loadingItems.value = true
  try {
    items.value = await dictionariesApi.listItems({ typeCode: selectedType.value })
  } catch (err) {
    ElMessage.error(err.message || '加载字典项失败')
  } finally {
    loadingItems.value = false
  }
}

async function selectType(code) {
  selectedType.value = code
  await loadItems()
}

function openCreateType() {
  resetTypeForm(null)
  typeDialogVisible.value = true
}

function openEditType(row) {
  resetTypeForm(row)
  typeDialogVisible.value = true
}

function openCreateItem() {
  resetItemForm(null)
  itemDialogVisible.value = true
}

function openEditItem(row) {
  resetItemForm(row)
  itemDialogVisible.value = true
}

async function saveType() {
  if (!typeForm.code || !typeForm.name) {
    ElMessage.warning('请填写编码和名称')
    return
  }
  const payload = {
    code: typeForm.code,
    name: typeForm.name,
    scope: typeForm.scope,
    isSystem: typeForm.isSystem,
    isActive: typeForm.isActive,
    remark: typeForm.remark || null,
  }
  try {
    if (editingTypeId.value) await dictionariesApi.updateType(editingTypeId.value, payload)
    else await dictionariesApi.createType(payload)
    ElMessage.success('已保存')
    typeDialogVisible.value = false
    await loadTypes()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function saveItem() {
  if (!itemForm.typeCode || !itemForm.label || !itemForm.value) {
    ElMessage.warning('请填写类型、名称和值')
    return
  }
  const payload = {
    typeCode: itemForm.typeCode,
    label: itemForm.label,
    value: itemForm.value,
    sortOrder: Number(itemForm.sortOrder),
    color: itemForm.color || null,
    isDefault: itemForm.isDefault,
    isSystem: itemForm.isSystem,
    isActive: itemForm.isActive,
    remark: itemForm.remark || null,
  }
  try {
    if (editingItemId.value) await dictionariesApi.updateItem(editingItemId.value, payload)
    else await dictionariesApi.createItem(payload)
    ElMessage.success('已保存')
    itemDialogVisible.value = false
    await loadItems()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function removeType(row) {
  try {
    await ElMessageBox.confirm(`确定删除字典类型「${row.name}」?`, '提示', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch { return }
  try {
    await dictionariesApi.removeType(row.id)
    ElMessage.success('已删除')
    if (selectedType.value === row.code) selectedType.value = ''
    await loadTypes()
    await loadItems()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

async function removeItem(row) {
  try {
    await ElMessageBox.confirm(`确定删除字典项「${row.label}」?`, '提示', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch { return }
  try {
    await dictionariesApi.removeItem(row.id)
    ElMessage.success('已删除')
    await loadItems()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

onMounted(async () => {
  await loadTypes()
  await loadItems()
})
</script>

<template>
  <div class="dict-page">
    <div class="summary-card">
      <div>
        <div class="summary-title">数据字典</div>
        <div class="summary-text">正式业务版：字典类型 dictionary_type + 字典项 dictionary_item，支持作用域、系统内置、默认项、颜色、启停和排序。</div>
      </div>
      <el-button type="primary" @click="openCreateType">新增字典类型</el-button>
    </div>

    <div class="content-grid">
      <div class="type-card app-card">
        <div class="card-head">字典类型</div>
        <el-table :data="types" v-loading="loadingTypes" size="small" highlight-current-row @row-click="(row) => selectType(row.code)">
          <el-table-column label="名称" min-width="120">
            <template #default="{ row }">
              <div class="type-name">{{ row.name }}</div>
              <div class="type-code">{{ row.code }}</div>
            </template>
          </el-table-column>
          <el-table-column label="作用域" prop="scope" width="90" />
          <el-table-column label="操作" width="88" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click.stop="openEditType(row)">编辑</el-button>
              <el-button link type="danger" size="small" :disabled="row.isSystem" @click.stop="removeType(row)">删</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="item-card app-card">
        <div class="card-head">
          <span>字典项：{{ currentTypeName }}</span>
          <el-button type="primary" size="small" :disabled="!selectedType" @click="openCreateItem">新增字典项</el-button>
        </div>
        <el-table :data="items" v-loading="loadingItems" border size="small" style="width:100%">
          <el-table-column label="显示名" prop="label" min-width="120" />
          <el-table-column label="值" prop="value" min-width="120" />
          <el-table-column label="排序" prop="sortOrder" width="70" align="center" />
          <el-table-column label="颜色" width="90" align="center">
            <template #default="{ row }"><el-tag :type="row.color || 'info'" size="small">{{ row.color || '-' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="默认" width="70" align="center">
            <template #default="{ row }">{{ row.isDefault ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '停用' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEditItem(row)">编辑</el-button>
              <el-button link type="danger" size="small" :disabled="row.isSystem" @click="removeItem(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="typeDialogVisible" :title="editingTypeId ? '编辑字典类型' : '新增字典类型'" width="560px">
      <el-form label-width="90px">
        <el-form-item label="编码" required><el-input v-model="typeForm.code" :disabled="Boolean(editingTypeId)" placeholder="如 secret_level" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="typeForm.name" /></el-form-item>
        <el-form-item label="作用域"><el-select v-model="typeForm.scope" style="width:100%"><el-option label="业务 business" value="business" /><el-option label="系统 system" value="system" /><el-option label="安全 security" value="security" /><el-option label="接口 integration" value="integration" /></el-select></el-form-item>
        <el-form-item label="系统内置"><el-switch v-model="typeForm.isSystem" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="typeForm.isActive" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="typeForm.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="typeDialogVisible = false">取消</el-button><el-button type="primary" @click="saveType">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="itemDialogVisible" :title="editingItemId ? '编辑字典项' : '新增字典项'" width="560px">
      <el-form label-width="90px">
        <el-form-item label="类型" required><el-select v-model="itemForm.typeCode" :disabled="Boolean(editingItemId)" style="width:100%"><el-option v-for="t in types" :key="t.code" :label="`${t.name} / ${t.code}`" :value="t.code" /></el-select></el-form-item>
        <el-form-item label="显示名" required><el-input v-model="itemForm.label" /></el-form-item>
        <el-form-item label="值" required><el-input v-model="itemForm.value" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="itemForm.sortOrder" :min="0" style="width:160px" /></el-form-item>
        <el-form-item label="颜色"><el-select v-model="itemForm.color" clearable style="width:100%"><el-option label="success" value="success" /><el-option label="primary" value="primary" /><el-option label="warning" value="warning" /><el-option label="danger" value="danger" /><el-option label="info" value="info" /></el-select></el-form-item>
        <el-form-item label="默认项"><el-switch v-model="itemForm.isDefault" /></el-form-item>
        <el-form-item label="系统内置"><el-switch v-model="itemForm.isSystem" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="itemForm.isActive" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="itemForm.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="itemDialogVisible = false">取消</el-button><el-button type="primary" @click="saveItem">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dict-page { display: flex; flex-direction: column; gap: 12px; }
.summary-card, .app-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; }
.summary-card { display: flex; justify-content: space-between; align-items: center; padding: 16px; }
.summary-title { color: var(--text-primary); font-size: 15px; font-weight: 600; }
.summary-text { margin-top: 6px; color: var(--text-regular); font-size: 13px; }
.content-grid { display: grid; grid-template-columns: 390px minmax(0, 1fr); gap: 12px; }
.type-card, .item-card { padding: 12px; min-width: 0; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; color: var(--text-primary); font-weight: 600; }
.type-name { color: var(--text-primary); font-weight: 500; }
.type-code { color: var(--text-secondary); font-size: 12px; margin-top: 2px; }
.item-card :deep(th.el-table__cell), .type-card :deep(th.el-table__cell) { background: var(--bg-muted); color: var(--text-regular); font-weight: 600; }
@media (max-width: 1100px) { .content-grid { grid-template-columns: 1fr; } }
</style>
