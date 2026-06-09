<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 配置驱动的表单:给一份「字段配置」,自动渲染出对应的表单控件。
 * 三类成果(论文/专利/软著)各自只写字段配置,表单本身这一个组件复用。
 *
 * sections: [{ title, fields: [{ prop, label, type, options, span, required, ... }] }]
 *   type 取值:text(默认) / textarea / number / select / date
 */
const props = defineProps({
  model: { type: Object, required: true }, // 表单数据对象(外部传入,双向绑定)
  sections: { type: Array, required: true }, // 分区块的字段配置
  labelWidth: { type: String, default: '100px' },
})

const formRef = ref()

// 从字段配置里自动收集「必填」校验规则
const rules = computed(() => {
  const r = {}
  for (const sec of props.sections) {
    for (const f of sec.fields) {
      if (f.required) {
        r[f.prop] = [
          { required: true, message: `${f.label}不能为空`, trigger: 'blur' },
        ]
      }
    }
  }
  return r
})

// DOI 自动补全:loading 状态 map,key 为字段 prop
const lookupLoading = ref({})

async function handleLookup(field) {
  const doi = props.model[field.prop]
  if (!doi) {
    ElMessage.warning('请先输入 DOI')
    return
  }
  lookupLoading.value[field.prop] = true
  try {
    const result = await field.lookupFn(doi)
    // 将返回字段合并到 model(跳过空值,保留已有内容)
    Object.entries(result).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        props.model[k] = v
      }
    })
    ElMessage.success('DOI 信息已自动填充')
  } catch (e) {
    ElMessage.error('查询失败:' + (e?.message || '未知错误'))
  } finally {
    lookupLoading.value[field.prop] = false
  }
}

// 暴露 validate 给父组件(ResourcePage)在保存前触发校验
defineExpose({ validate: () => formRef.value.validate() })
</script>

<template>
  <el-form ref="formRef" :model="model" :rules="rules" :label-width="labelWidth">
    <template v-for="sec in sections" :key="sec.title">
      <el-divider content-position="left">{{ sec.title }}</el-divider>
      <el-row :gutter="16">
        <el-col v-for="f in sec.fields" :key="f.prop" :span="f.span || 12">
          <el-form-item :label="f.label" :prop="f.prop">
            <!-- 多行文本 -->
            <el-input
              v-if="f.type === 'textarea'"
              v-model="model[f.prop]"
              type="textarea"
              :rows="f.rows || 3"
              :placeholder="f.placeholder"
            />
            <!-- 数字 -->
            <el-input-number
              v-else-if="f.type === 'number'"
              v-model="model[f.prop]"
              :min="f.min"
              :max="f.max"
              :precision="f.precision"
              controls-position="right"
              style="width: 100%"
            />
            <!-- 下拉选择 -->
            <el-select
              v-else-if="f.type === 'select'"
              v-model="model[f.prop]"
              clearable
              style="width: 100%"
              :placeholder="f.placeholder"
            >
              <el-option v-for="o in f.options" :key="o" :label="o" :value="o" />
            </el-select>
            <!-- 日期 -->
            <el-date-picker
              v-else-if="f.type === 'date'"
              v-model="model[f.prop]"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              :placeholder="f.placeholder || '选择日期'"
            />
            <!-- DOI 自动补全:输入框 + 查询按钮 -->
            <el-input
              v-else-if="f.type === 'doi-lookup'"
              v-model="model[f.prop]"
              :placeholder="f.placeholder"
              clearable
            >
              <template #append>
                <el-button
                  :loading="lookupLoading[f.prop]"
                  @click="handleLookup(f)"
                >自动补全</el-button>
              </template>
            </el-input>
            <!-- 普通文本(默认) -->
            <el-input
              v-else
              v-model="model[f.prop]"
              :placeholder="f.placeholder"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </template>
  </el-form>
</template>
