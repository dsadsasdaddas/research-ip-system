<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import http from '../api/http'

// ===== 数据 =====
const loading = ref(true)
const stats = ref(null)

async function loadStats() {
  loading.value = true
  try {
    stats.value = await http.get('/stats')
    await nextTick()
    initCharts()
  } catch (e) {
    console.error('统计数据加载失败', e)
  } finally {
    loading.value = false
  }
}

// ===== ECharts 实例管理 =====
const chartInstances = []

function initChart(id, option) {
  const el = document.getElementById(id)
  if (!el) return
  const chart = echarts.init(el)
  chart.setOption(option)
  chartInstances.push(chart)
}

function initCharts() {
  const s = stats.value
  if (!s) return

  // 通用颜色
  const COLORS = { paper: '#185FA5', patent: '#0F6E56', copyright: '#534AB7', transform: '#B87333' }

  // 1. 年度趋势折线图
  initChart('chart-trend', {
    tooltip: { trigger: 'axis' },
    legend: { data: ['论文', '专利', '软著'], bottom: 0 },
    grid: { top: 16, left: 40, right: 16, bottom: 40 },
    xAxis: { type: 'category', data: s.trend.years, axisLine: { lineStyle: { color: '#ccc' } } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '论文', type: 'line', smooth: true, data: s.trend.papers, itemStyle: { color: COLORS.paper }, areaStyle: { opacity: 0.08 } },
      { name: '专利', type: 'line', smooth: true, data: s.trend.patents, itemStyle: { color: COLORS.patent }, areaStyle: { opacity: 0.08 } },
      { name: '软著', type: 'line', smooth: true, data: s.trend.copyrights, itemStyle: { color: COLORS.copyright }, areaStyle: { opacity: 0.08 } },
    ],
  })

  // 2. 成果类型分布饼图
  initChart('chart-type', {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      type: 'pie', radius: ['40%', '68%'], center: ['40%', '50%'],
      data: s.typeDist.map((d) => ({ ...d, itemStyle: { color: d.name === '论文' ? COLORS.paper : d.name === '专利' ? COLORS.patent : COLORS.copyright } })),
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    }],
  })

  // 3. 部门排行柱状图（横向）
  const depts = s.deptRank.map((d) => d.dept)
  const counts = s.deptRank.map((d) => d.count)
  initChart('chart-dept', {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 8, left: 8, right: 24, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: depts.reverse(), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar', data: counts.reverse(), barMaxWidth: 20,
      itemStyle: { color: COLORS.paper, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', fontSize: 12 },
    }],
  })

  // 4. 专利法律状态柱状图
  const statusColors = { '授权': COLORS.patent, '申请中': COLORS.paper, '失效': '#E24B4A', '驳回': '#888' }
  initChart('chart-patent-status', {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 8, left: 8, right: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: s.patentStatus.map((d) => d.status) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      type: 'bar', barMaxWidth: 40,
      data: s.patentStatus.map((d) => ({
        value: d.count,
        itemStyle: { color: statusColors[d.status] || '#aaa', borderRadius: [4, 4, 0, 0] },
      })),
      label: { show: true, position: 'top', fontSize: 12 },
    }],
  })

  // 5. 转化合同金额 vs 到账金额
  const amt = s.transformAmounts
  initChart('chart-transform-amount', {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p) => p.map((i) => `${i.name}：¥${i.value.toLocaleString()}`).join('<br>') },
    grid: { top: 16, left: 8, right: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: ['合同金额', '已到账'] },
    yAxis: { type: 'value', axisLabel: { formatter: (v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v } },
    series: [{
      type: 'bar', barMaxWidth: 60,
      data: [
        { value: amt.contract, itemStyle: { color: COLORS.paper, borderRadius: [4, 4, 0, 0] } },
        { value: amt.received, itemStyle: { color: COLORS.patent, borderRadius: [4, 4, 0, 0] } },
      ],
      label: { show: true, position: 'top', formatter: (p) => `¥${p.value.toLocaleString()}` },
    }],
  })

  // 6. 转化漏斗
  const maxCount = Math.max(...s.funnel.map((f) => f.count), 1)
  initChart('chart-funnel', {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 项' },
    series: [{
      type: 'funnel',
      left: '10%', width: '80%', top: 16, bottom: 16,
      min: 0, max: maxCount,
      minSize: '20%', maxSize: '100%',
      sort: 'none',
      gap: 4,
      label: { show: true, position: 'inside', color: '#fff', fontSize: 12 },
      data: s.funnel.map((f, i) => ({
        name: f.stage,
        value: f.count,
        itemStyle: { color: ['#185FA5', '#0F6E56', '#534AB7', '#B87333'][i] || '#aaa' },
      })),
    }],
  })
}

// 窗口 resize 时重绘
function onResize() { chartInstances.forEach((c) => c.resize()) }

onMounted(() => {
  loadStats()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chartInstances.forEach((c) => c.dispose())
})
</script>

<template>
  <div class="dashboard" v-loading="loading">

    <!-- 统计卡 -->
    <div class="stat-grid" v-if="stats">
      <div class="stat-card">
        <div class="stat-label">论文总数</div>
        <div class="stat-val blue">{{ stats.totals.papers }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">专利总数</div>
        <div class="stat-val green">{{ stats.totals.patents }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">软著总数</div>
        <div class="stat-val purple">{{ stats.totals.copyrights }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">转化项目</div>
        <div class="stat-val">{{ stats.totals.transforms }}</div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="chart-row" v-if="stats">
      <!-- 折线：2/3 宽 -->
      <div class="chart-card wide">
        <div class="chart-title">年度成果数量趋势</div>
        <div id="chart-trend" class="chart-body"></div>
      </div>
      <!-- 饼图：1/3 宽 -->
      <div class="chart-card narrow">
        <div class="chart-title">成果类型分布</div>
        <div id="chart-type" class="chart-body"></div>
      </div>
    </div>

    <div class="chart-row" v-if="stats">
      <!-- 部门排行：1/2 -->
      <div class="chart-card half">
        <div class="chart-title">部门成果排行</div>
        <div id="chart-dept" class="chart-body"></div>
      </div>
      <!-- 专利状态：1/2 -->
      <div class="chart-card half">
        <div class="chart-title">专利法律状态</div>
        <div id="chart-patent-status" class="chart-body"></div>
      </div>
    </div>

    <div class="chart-row" v-if="stats">
      <!-- 转化金额对比：1/2 -->
      <div class="chart-card half">
        <div class="chart-title">转化合同金额 vs 已到账</div>
        <div id="chart-transform-amount" class="chart-body"></div>
      </div>
      <!-- 漏斗：1/2 -->
      <div class="chart-card half">
        <div class="chart-title">转化漏斗</div>
        <div id="chart-funnel" class="chart-body"></div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}

/* 统计卡 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px 20px;
}
.stat-label {
  font-size: 13px;
  color: var(--text-regular);
  margin-bottom: 8px;
}
.stat-val {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
}
.stat-val.blue   { color: #185FA5; }
.stat-val.green  { color: #0F6E56; }
.stat-val.purple { color: #534AB7; }

/* 图表行 */
.chart-row {
  display: flex;
  gap: 12px;
}
.chart-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  min-width: 0;
}
.chart-card.wide   { flex: 2; }
.chart-card.narrow { flex: 1; }
.chart-card.half   { flex: 1; }

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.chart-body {
  height: 220px;
  width: 100%;
}
</style>
