<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search as SearchIcon, Download } from '@element-plus/icons-vue'
import SchemaForm from './SchemaForm.vue'
import http from '../api/http'
import { useResourceListStore } from '../stores/useResourceListStore'

/**
 * 通用「成果管理页」:搜索 + 列表表格 + 新增/编辑弹窗 + 删除。
 * 论文/专利/软著三类成果都用它,差异全部由传入的配置决定:
 *   - columns:    表格列(可标 tag 渲染成彩色标签)
 *   - formSections: 弹窗表单的字段配置(交给 SchemaForm 渲染)
 *   - blankForm:  返回一份空白表单对象的函数
 *   - api:        一套增删改查函数(createCrudApi 生成)
 *   - resourcePath: (可选)资源路径,用于导出接口
 */
const props = defineProps({
  entityName: { type: String, default: '记录' }, // 用于"新增XX""编辑XX"等文案
  searchPlaceholder: { type: String, default: '搜索' },
  newButtonText: { type: String, default: '新增' },
  columns: { type: Array, required: true },
  formSections: { type: Array, required: true },
  blankForm: { type: Function, required: true },
  api: { type: Object, required: true },
  resourcePath: { type: String, default: '' },
  // 列表状态(分页/关键字)持久化的键,默认取 resourcePath
  storeKey: { type: String, default: '' },
})

// ===== 列表状态持久化:从 store 恢复分页与关键字 =====
const resourceListStore = useResourceListStore()
const listKey = props.storeKey || props.resourcePath || ''
const saved = listKey ? resourceListStore.get(listKey) : null

// ===== 列表 & 搜索 & 分页 =====
const rows = ref([])
const keyword = ref(saved?.keyword ?? '')
const loading = ref(false)
const page = ref(saved?.page ?? 1)
const pageSize = ref(saved?.pageSize ?? 20)
const total = ref(0)

// 关键字/分页变化时回写 store,离开再回来即可恢复
watch(
  [keyword, page, pageSize],
  () => {
    if (listKey) {
      resourceListStore.set(listKey, {
        keyword: keyword.value,
        page: page.value,
        pageSize: pageSize.value,
      })
    }
  },
  { deep: true },
)

async function loadList() {
  loading.value = true
  try {
    const res = await props.api.list({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    rows.value = res.items ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error('加载列表失败:' + e.message)
  } finally {
    loading.value = false
  }
}

// 搜索/切换每页条数时回到第一页(结果集或页码范围变了)
function onSearch() {
  page.value = 1
  loadList()
}
function onPageChange(p) {
  page.value = p
  loadList()
}
function onSizeChange(s) {
  pageSize.value = s
  page.value = 1
  loadList()
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

// ===== 导出 =====
const exportLoading = ref(false)

async function handleExport(format) {
  if (!props.resourcePath) {
    ElMessage.warning('未配置导出路径')
    return
  }
  exportLoading.value = true
  try {
    // 把表格列配置(prop/label)作为导出列传给后端 → 导出文件带中文表头
    const body = {
      format,
      keyword: keyword.value,
      columns: props.columns.map((c) => ({ key: c.prop, header: c.label })),
    }
    // responseType:blob 才能拿到二进制文件;响应拦截器已是 res=>res.data,故这里直接得到 Blob
    const blob = await http.post(`/${props.resourcePath}/export`, body, { responseType: 'blob' })
    // 极少数情况后端用 200 返回 JSON 错误体(也被包成 blob),按类型识别后展示真实错误
    if (blob.type && blob.type.includes('application/json')) {
      const err = JSON.parse(await blob.text())
      ElMessage.error('导出失败：' + (err.message || ''))
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.entityName}_${format.toUpperCase()}.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败：' + (e.message || ''))
  } finally {
    exportLoading.value = false
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
        @keyup.enter="onSearch"
        @clear="onSearch"
      />
      <el-button @click="onSearch">搜索</el-button>
      <div class="spacer" />
      <el-dropdown v-if="resourcePath" trigger="click" @command="handleExport" style="margin-right: 8px">
        <el-button :loading="exportLoading">
          <el-icon style="margin-right: 4px"><Download /></el-icon>导出
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="xlsx">XLSX</el-dropdown-item>
            <el-dropdown-item command="csv">CSV</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
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
      <div class="pager">
        <el-pagination
          background
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </div>

    <!-- 新增 / 编辑 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="760px" top="6vh" class="res-dialog">
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
.pager {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
}
.res-table {
  width: 100%;
}
.res-table :deep(th.el-table__cell) {
  background: var(--bg-muted);
  color: var(--text-regular);
  font-weight: 600;
}

/* ===== 响应式:窄屏下工具条换行、表格容器不撑破视口、弹窗自适应宽度 ===== */
@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    padding: 10px 12px;
  }
  .toolbar .spacer {
    /* 让换行后搜索框独占一行更紧凑 */
    flex-basis: 100%;
    height: 0;
    padding: 0;
  }
  .table-card {
    padding: 0;
  }
  .pager {
    justify-content: center;
    padding: 8px 4px;
  }
}

/* 弹窗在窄屏按视口宽度自适应(覆盖 760px 固定宽) */
@media (max-width: 800px) {
  .res-dialog :deep(.el-dialog) {
    width: 94vw !important;
    margin: 0 auto !important;
  }
}
</style>
