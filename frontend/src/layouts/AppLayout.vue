<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Document,
  Medal,
  Files,
  DataAnalysis,
  Bell,
  Search,
  Setting,
  Fold,
  Expand,
} from '@element-plus/icons-vue'

// 整站布局壳:左侧栏(可折叠)+ 顶栏 + 内容区。
// 页面本身只管业务,布局都在这里,新增模块只要在侧栏加一项。
const route = useRoute()
const collapsed = ref(false)
const activeMenu = computed(() => route.path) // 当前高亮的菜单
const pageTitle = computed(() => route.meta.title || '') // 顶栏显示的页名
</script>

<template>
  <el-container class="layout">
    <!-- 左侧栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="brand">
        <span v-show="!collapsed" class="brand-text">科研成果管理系统</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="collapsed"
        router
        class="menu"
      >
        <el-sub-menu index="reg">
          <template #title>
            <el-icon><Files /></el-icon><span>成果登记</span>
          </template>
          <el-menu-item index="/papers">
            <el-icon><Document /></el-icon><span>论文管理</span>
          </el-menu-item>
          <el-menu-item index="/patents">
            <el-icon><Medal /></el-icon><span>专利管理</span>
          </el-menu-item>
          <el-menu-item index="/copyrights">
            <el-icon><Files /></el-icon><span>软件著作权</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon><span>统计看板</span>
        </el-menu-item>
        <el-menu-item index="/reminders">
          <el-icon><Bell /></el-icon><span>申报提醒</span>
        </el-menu-item>
        <el-menu-item index="/search">
          <el-icon><Search /></el-icon><span>全文检索</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon><span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧:顶栏 + 内容 -->
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed">
            <component :is="collapsed ? Expand : Fold" />
          </el-icon>
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <span class="user">王悦 · 科研人员</span>
        </div>
      </el-header>

      <el-main class="main">
        <!-- 用 route.path 作 key:切换模块时强制重建页面,确保各页数据独立加载 -->
        <router-view :key="route.path" />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
}

/* 侧栏:浅色 + 右细边框,干净不压抑 */
.aside {
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  transition: width 0.2s;
  overflow: hidden;
}
.brand {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
}
.brand-mark {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}
.menu {
  border-right: none;
}
.menu:not(.el-menu--collapse) {
  width: 220px;
}
/* 选中项:浅色块 + 左侧 2px 点缀条,克制不刺眼 */
.menu :deep(.el-menu-item) {
  position: relative;
}
.menu :deep(.el-menu-item.is-active) {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.menu :deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--el-color-primary);
}

/* 顶栏:白底 + 下边框 */
.header {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  font-size: 18px;
  cursor: pointer;
  color: var(--text-regular);
}
.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.user {
  font-size: 13px;
  color: var(--text-regular);
}

/* 内容区:灰底,留白克制 */
.main {
  background: var(--bg-page);
  padding: 16px;
}
</style>
