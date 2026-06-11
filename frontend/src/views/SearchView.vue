<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { searchApi } from '../api/search'
import searchLogsApi from '../api/search-logs'
import { useRouter } from 'vue-router'

const router = useRouter()
const q       = ref('')
const types   = ref([])
const loading = ref(false)
const result  = ref(null)

// 热门搜索
const hotKeywords = ref([])

const TYPE_OPTS = [
  { label: '论文', value: 'paper' },
  { label: '专利', value: 'patent' },
  { label: '软著', value: 'copyright' },
]
const TYPE_COLOR = { paper: '', patent: 'success', copyright: 'warning' }

async function doSearch() {
  if (!q.value.trim()) { ElMessage.warning('请输入关键词'); return }
  loading.value = true
  try {
    result.value = await searchApi.search(q.value.trim(), types.value)
  } catch { ElMessage.error('检索失败') }
  finally { loading.value = false }
}

function goDetail(item) {
  const pathMap = { paper: '/papers', patent: '/patents', copyright: '/copyrights' }
  if (pathMap[item.type]) router.push(pathMap[item.type])
}

function clickHotKeyword(keyword) {
  q.value = keyword
  doSearch()
}

async function loadHotKeywords() {
  try {
    hotKeywords.value = await searchLogsApi.hotKeywords(10)
  } catch { /* silent */ }
}

onMounted(loadHotKeywords)
</script>

<template>
  <div class="search-page">
    <div class="search-box">
      <el-input
        v-model="q"
        placeholder="输入关键词搜索论文、专利、软著（标题、作者、编号等）"
        size="large"
        clearable
        style="flex:1"
        @keyup.enter="doSearch"
      >
        <template #suffix>
          <el-button type="primary" :loading="loading" @click="doSearch" style="border-radius:0 4px 4px 0; margin-right:-12px">
            搜索
          </el-button>
        </template>
      </el-input>
    </div>

    <!-- 热门搜索 -->
    <div class="hot-keywords" v-if="hotKeywords.length > 0">
      <span class="hot-label">热门搜索：</span>
      <div class="hot-tags">
        <el-tag
          v-for="(kw, idx) in hotKeywords"
          :key="idx"
          class="hot-tag"
          effect="plain"
          @click="clickHotKeyword(kw.keyword || kw)"
        >
          {{ kw.keyword || kw }}
        </el-tag>
      </div>
    </div>

    <div class="filter-bar">
      <span style="font-size:13px; color: var(--text-secondary); margin-right:8px">范围：</span>
      <el-checkbox-group v-model="types">
        <el-checkbox v-for="t in TYPE_OPTS" :key="t.value" :label="t.value">{{ t.label }}</el-checkbox>
      </el-checkbox-group>
      <span style="margin-left: auto; font-size: 12px; color: var(--text-secondary)" v-if="result">
        搜索引擎：{{ result.engine === 'rust' ? 'Rust' : result.engine }} · {{ Number(result.elapsedMs || 0).toFixed(1) }}ms · 共 {{ result.total }} 条结果
      </span>
    </div>

    <div v-if="result && result.items.length === 0" class="empty">
      未找到匹配结果
    </div>

    <div class="result-list" v-if="result && result.items.length > 0">
      <div
        v-for="item in result.items"
        :key="`${item.type}-${item.id}`"
        class="result-item"
        @click="goDetail(item)"
      >
        <div class="item-header">
          <el-tag :type="TYPE_COLOR[item.type]" size="small" style="margin-right:8px">{{ item.typeLabel }}</el-tag>
          <span class="item-title">{{ item.title }}</span>
        </div>
        <div class="item-meta" v-if="item.meta">{{ item.meta }}</div>
      </div>
    </div>

    <div class="hint" v-if="!result">
      <p>支持搜索：论文标题/作者/DOI/期刊，专利名称/发明人/申请号，软著名称/作者/登记号</p>
    </div>
  </div>
</template>

<style scoped>
.search-page { display: flex; flex-direction: column; gap: 12px; }
.search-box { display: flex; gap: 0; }
.hot-keywords {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 10px 16px;
}
.hot-label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.hot-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.hot-tag { cursor: pointer; transition: color 0.15s; }
.hot-tag:hover { color: var(--el-color-primary); border-color: var(--el-color-primary); }
.filter-bar {
  display: flex; align-items: center; gap: 4px;
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 10px 16px;
}
.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-item {
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 14px 16px; cursor: pointer; transition: border-color .15s;
}
.result-item:hover { border-color: var(--el-color-primary); }
.item-header { display: flex; align-items: center; }
.item-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.item-meta { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.empty { text-align: center; color: var(--text-secondary); padding: 60px 0; font-size: 14px; }
.hint {
  text-align: center; color: var(--text-secondary); padding: 60px 0; font-size: 13px;
  background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;
}
</style>
