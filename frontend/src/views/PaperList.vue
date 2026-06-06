<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listPapers,
  createPaper,
  updatePaper,
  deletePaper,
} from '../api/papers'

// ===== 列表 & 搜索 =====
const papers = ref([]) // 列表数据
const keyword = ref('') // 搜索关键词
const loading = ref(false) // 表格加载中状态

// ===== 弹窗表单 =====
const dialogVisible = ref(false)
const dialogTitle = ref('新增论文')
const editingId = ref(null) // null = 新增模式;有值 = 编辑该 id
const formRef = ref() // 指向 el-form,用来触发校验

// 一份空白表单(字段对照说明书 §3.1.1 / §6.2)
const blankForm = () => ({
  title: '',
  doi: '',
  firstAuthor: '',
  correspondingAuthor: '',
  authors: '',
  outerAuthors: '',
  cooperateUnit: '',
  journal: '',
  issnCn: '',
  volumePage: '',
  publishYear: null,
  impactFactor: null,
  includedType: '',
  partition: '',
  status: '',
  summary: '',
  secretLevel: '公开',
  dependProject: '',
  deptId: null,
  createUser: '',
})
const form = reactive(blankForm())

// 校验规则:目前只有标题必填(和后端 DTO 一致)
const rules = {
  title: [{ required: true, message: '论文标题不能为空', trigger: 'blur' }],
}

// 下拉选项(枚举类字段做成选择框,录入更规范)
const includedOptions = ['SCI', 'EI', 'CSCD', 'CSSCI', '中文核心', '其他']
const partitionOptions = ['一区', '二区', '三区', '四区']
const statusOptions = ['在线发表', '正式出版']
const secretOptions = ['公开', '内部', '涉密']

// ===== 数据操作 =====

/** 拉取列表(带当前关键词) */
async function loadList() {
  loading.value = true
  try {
    papers.value = await listPapers(keyword.value)
  } catch (e) {
    ElMessage.error('加载列表失败:' + e.message)
  } finally {
    loading.value = false
  }
}

/** 打开「新增」弹窗:清空表单 */
function openCreate() {
  editingId.value = null
  dialogTitle.value = '新增论文'
  Object.assign(form, blankForm())
  dialogVisible.value = true
}

/** 打开「编辑」弹窗:用所选行的数据回填 */
function openEdit(row) {
  editingId.value = row.id
  dialogTitle.value = `编辑论文 #${row.id}`
  Object.assign(form, blankForm(), row) // 先铺空白兜底,再用行数据覆盖
  dialogVisible.value = true
}

/** 提交表单:新增或更新 */
async function submitForm() {
  // 校验不通过会抛异常,后面不执行
  await formRef.value.validate()
  try {
    if (editingId.value == null) {
      await createPaper({ ...form })
      ElMessage.success('登记成功')
    } else {
      await updatePaper(editingId.value, { ...form })
      ElMessage.success('已保存')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {
    ElMessage.error('保存失败:' + e.message)
  }
}

/** 删除一行(先二次确认) */
async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除论文「${row.title}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户点了取消
  }
  try {
    await deletePaper(row.id)
    ElMessage.success('已删除')
    loadList()
  } catch (e) {
    ElMessage.error('删除失败:' + e.message)
  }
}

// 页面打开时先加载一次列表
onMounted(loadList)
</script>

<template>
  <div class="page">
    <!-- 顶部操作条:标题 + 搜索 + 新增 -->
    <div class="toolbar">
      <h2 class="title">论文管理</h2>
      <div class="actions">
        <el-input
          v-model="keyword"
          placeholder="按标题搜索"
          clearable
          style="width: 240px"
          @keyup.enter="loadList"
          @clear="loadList"
        />
        <el-button type="primary" @click="loadList">搜索</el-button>
        <el-button type="success" @click="openCreate">+ 新增论文</el-button>
      </div>
    </div>

    <!-- 论文列表 -->
    <el-table :data="papers" v-loading="loading" border stripe height="62vh">
      <el-table-column type="index" label="#" width="55" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="firstAuthor" label="第一作者" width="100" />
      <el-table-column prop="journal" label="期刊" width="160" show-overflow-tooltip />
      <el-table-column prop="publishYear" label="年份" width="80" />
      <el-table-column prop="includedType" label="收录" width="90" />
      <el-table-column prop="partition" label="分区" width="80" />
      <el-table-column label="密级" width="84">
        <template #default="{ row }">
          <el-tag
            :type="row.secretLevel === '公开' ? 'success' : 'danger'"
            size="small"
          >
            {{ row.secretLevel }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>暂无数据,点右上角「新增论文」登记第一篇</template>
    </el-table>

    <!-- 新增 / 编辑 弹窗(全部字段,分区块) -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="760px" top="6vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-divider content-position="left">基础信息</el-divider>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="论文标题" prop="title">
              <el-input v-model="form.title" placeholder="必填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="DOI">
              <el-input v-model="form.doi" placeholder="如 10.1038/xxxxx" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="第一作者">
              <el-input v-model="form.firstAuthor" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="通讯作者">
              <el-input v-model="form.correspondingAuthor" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合作单位">
              <el-input v-model="form.cooperateUnit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="院内作者">
              <el-input v-model="form.authors" placeholder="多个用逗号隔开" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="外单位作者">
              <el-input v-model="form.outerAuthors" placeholder="多个用逗号隔开" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">期刊与收录</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="期刊名称">
              <el-input v-model="form.journal" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="ISSN/CN">
              <el-input v-model="form.issnCn" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="卷期页码">
              <el-input v-model="form.volumePage" placeholder="如 Vol.12(3), 45-60" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发表年份">
              <el-input-number
                v-model="form.publishYear"
                :min="1900"
                :max="2100"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="影响因子">
              <el-input-number
                v-model="form.impactFactor"
                :precision="3"
                :min="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收录情况">
              <el-select v-model="form.includedType" clearable style="width: 100%">
                <el-option v-for="o in includedOptions" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="中科院分区">
              <el-select v-model="form.partition" clearable style="width: 100%">
                <el-option v-for="o in partitionOptions" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成果状态">
              <el-select v-model="form.status" clearable style="width: 100%">
                <el-option v-for="o in statusOptions" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">摘要与归属</el-divider>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="摘要">
              <el-input v-model="form.summary" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密级">
              <el-select v-model="form.secretLevel" style="width: 100%">
                <el-option v-for="o in secretOptions" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="依托项目">
              <el-input v-model="form.dependProject" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属部门ID">
              <el-input-number
                v-model="form.deptId"
                :min="1"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="登记人">
              <el-input v-model="form.createUser" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.toolbar .title {
  margin: 0;
  font-size: 18px;
}
.toolbar .actions {
  display: flex;
  gap: 8px;
}
</style>
