<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  Document, Medal, Files, DataAnalysis, Bell, Search,
  Setting, Fold, Expand, Refresh, Wallet, List,
} from '@element-plus/icons-vue'

const route    = useRoute()
const router   = useRouter()
const auth     = useAuthStore()
const collapsed = ref(false)
const activeMenu = computed(() => route.path)
const pageTitle  = computed(() => route.meta.title || '')
const isSysAdmin = computed(() => auth.user?.role === 'sys_admin')

function logout() { auth.logout(); router.push('/login') }
</script>

<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="brand">
        <span v-show="!collapsed" class="brand-text">科研成果管理系统</span>
      </div>

      <el-menu :default-active="activeMenu" :collapse="collapsed" router class="menu">
        <el-sub-menu index="reg">
          <template #title><el-icon><Files /></el-icon><span>成果登记</span></template>
          <el-menu-item index="/papers"><el-icon><Document /></el-icon><span>论文管理</span></el-menu-item>
          <el-menu-item index="/patents"><el-icon><Medal /></el-icon><span>专利管理</span></el-menu-item>
          <el-menu-item index="/copyrights"><el-icon><Files /></el-icon><span>软件著作权</span></el-menu-item>
          <el-menu-item index="/transforms"><el-icon><Refresh /></el-icon><span>成果转化</span></el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/fees"><el-icon><Wallet /></el-icon><span>费用管理</span></el-menu-item>
        <el-menu-item index="/reminders"><el-icon><Bell /></el-icon><span>申报提醒</span></el-menu-item>
        <el-menu-item index="/search"><el-icon><Search /></el-icon><span>全文检索</span></el-menu-item>
        <el-menu-item index="/dashboard"><el-icon><DataAnalysis /></el-icon><span>统计看板</span></el-menu-item>
        <el-menu-item index="/audit-logs"><el-icon><List /></el-icon><span>操作日志</span></el-menu-item>

        <el-sub-menu v-if="isSysAdmin" index="sys">
          <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
          <el-menu-item index="/users"><el-icon><Setting /></el-icon><span>用户管理</span></el-menu-item>
          <el-menu-item index="/departments"><el-icon><Setting /></el-icon><span>部门管理</span></el-menu-item>
          <el-menu-item index="/dictionaries"><el-icon><Setting /></el-icon><span>数据字典</span></el-menu-item>
          <el-menu-item index="/integrations"><el-icon><Setting /></el-icon><span>接口配置</span></el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed">
            <component :is="collapsed ? Expand : Fold" />
          </el-icon>
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <span class="user">{{ auth.user?.realName || auth.user?.username }} · {{ auth.user?.role }}</span>
          <el-button link size="small" style="margin-left:12px" @click="logout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <router-view :key="route.path" />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout { height: 100vh; }
.aside { background: var(--bg-surface); border-right: 1px solid var(--border-color); transition: width 0.2s; overflow: hidden; }
.brand { height: 56px; display: flex; align-items: center; gap: 10px; padding: 0 16px; border-bottom: 1px solid var(--border-color); }
.brand-text { font-size: 15px; font-weight: 600; color: var(--text-primary); white-space: nowrap; }
.menu { border-right: none; }
.menu:not(.el-menu--collapse) { width: 220px; }
.menu :deep(.el-menu-item) { position: relative; }
.menu :deep(.el-menu-item.is-active) { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
.menu :deep(.el-menu-item.is-active)::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--el-color-primary);
}
.header { height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.collapse-btn { font-size: 18px; cursor: pointer; color: var(--text-regular); }
.page-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.user { font-size: 13px; color: var(--text-regular); }
.main { background: var(--bg-page); padding: 16px; }
</style>
