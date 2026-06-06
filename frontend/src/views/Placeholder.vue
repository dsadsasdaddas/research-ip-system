<script setup>
import { useRoute } from 'vue-router'

// 通用占位页:专利/软著/看板/提醒/检索/设置等还没做的模块共用,
// 让整体骨架在演示时是完整的。
const route = useRoute()
</script>

<template>
  <div class="placeholder app-card">
    <el-empty :description="`「${route.meta.title}」建设中`" />
    <p class="hint">该模块属于系统规划范围,先放占位页,保证整体骨架完整。</p>
  </div>
</template>

<style scoped>
.placeholder {
  padding: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hint {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
