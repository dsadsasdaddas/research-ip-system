<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search as SearchIcon } from '@element-plus/icons-vue'
import SchemaForm from './SchemaForm.vue'

/**
 * 通用「成果管理页」:搜索 + 列表表格 + 新增/编辑弹窗 + 删除。
 * 论文/专利/软著三类成果都用它,差异全部由传入的配置决定:
 *   - columns:    表格列(可标 tag 渲染成彩色标签)
 *   - formSections: 弹窗表单的字段配置(交给 SchemaForm 渲染)
 *   - blankForm:  返回一份空白表单对象的函数
 *   - api:        一套增删改查函数(createCrudApi 生成)
 */
const props = defineProps({
  entityName: { type: String, default: '记录' }, // 用于"新增XX""编辑XX"等文案
  searchPlaceholder: { type: String, default: '搜索' },
  newButtonText: { type: String, default: '新增' },
  columns: { type: Array, required: true },
  formSections: { type: Array, required: true },
  blankForm: { type: Function, required: true },
  api: { type: Object, required: true },
})

// ===== 列表 & 搜索 =====
const rows = ref([])
const keyword = ref('')
const loading = ref(false)

async function loadList() {
  loading.value = true
  try {
    rows.value = await props.api.list(keyword.value)
  } catch (e) {
    ElMessage.error('加载列表失败:' + e.message)
  } finally {
    loading.value = false
  }
}

// ===== 弹窗表单 =====
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref(null)
const formRef = ref()
const form = reactive(props.blankForm())

function openCreate() {
  editingId.value = null
  dialogTitle.value = `新增${props.entityName}`
  Object.assign(form, props.blankForm())
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  dialogTitle.value = `编辑${props.entityName} #${row.id}`
  Object.assign(form, props.blankForm(), row) // 空白兜底 + 行数据覆盖
  dialogVisible.value = true
}

async function submitForm() {
  try {
    await formRef.value.validate()
  } catch {
    return // 校验不通过,字段下方已提示
  }
  try {
    if (editingId.value == null) {
      await props.api.create({ ...form })
      ElMessage.success('登记成功')
    } else {
      await props.api.update(editingId.value, { ...form })
      ElMessage.success('已保存')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {
    ElMessage.error('保存失败:' + e.message)
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name || row.title}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await props.api.remove(row.id)
    ElMessage.success('已删除')
    loadList()
  } catch (e) {
    ElMessage.error('删除失败:' + e.message)
  }
}

onMounted(loadList)
</script>

<template>
  <div class="page">
    <!-- 工具条:搜索 + 新增 -->
    <div class="toolbar app-card">
      <el-input
        v-model="keyword"
        :placeholder="searchPlaceholder"
        clearable
        :prefix-icon="SearchIcon"
        style="width: 260px"
        @keyup.enter="loadList"
        @clear="loadList"
      />
      <el-button @click="loadList">搜索</el-button>
      <div class="spacer" />
      <el-button type="primary" @click="openCreate">{{ newButtonText }}</el-button>
    </div>

    <!-- 列表 -->
    <div class="table-card app-card">
      <el-table :data="rows" v-loading="loading" class="res-table">
        <el-table-column type="index" label="#" width="55" />
        <el-table-column
          v-for="col in columns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :show-overflow-tooltip="col.showOverflow"
        >
          <!-- 标签列(密级、法律状态等):用彩色标签呈现 -->
          <template v-if="col.tag" #default="{ row }">
            <el-tag
              :type="col.tagType ? col.tagType(row[col.prop]) : 'info'"
              size="small"
              effect="light"
            >
              {{ row[col.prop] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>暂无数据,点右上角「{{ newButtonText }}」登记第一条</template>
      </el-table>
    </div>

    <!-- 新增 / 编辑 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="760px" top="6vh">
      <SchemaForm ref="formRef" :model="form" :sections="formSections" />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}
.toolbar .spacer {
  flex: 1;
}
.table-card {
  padding: 4px 4px 8px;
}
.res-table {
  width: 100%;
}
.res-table :deep(th.el-table__cell) {
  background: var(--bg-muted);
  color: var(--text-regular);
  font-weight: 600;
}
</style>
