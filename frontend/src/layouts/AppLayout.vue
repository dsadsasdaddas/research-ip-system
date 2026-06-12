<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import notificationsApi from '../api/notifications'
import {
  Document, Medal, Files, DataAnalysis, Bell, Search,
  Setting, Fold, Expand, Refresh, Wallet, List,
  Checked, Tickets, Notification, PieChart, Lock, FolderChecked,
} from '@element-plus/icons-vue'

const route    = useRoute()
const router   = useRouter()
const auth     = useAuthStore()
const collapsed = ref(false)
const activeMenu = computed(() => route.path)
const pageTitle  = computed(() => route.meta.title || '')
const isSysAdmin = computed(() => auth.user?.role === 'sys_admin')

// ===== 移动端:抽屉式侧栏(<768px 隐藏常驻侧栏,用汉堡按钮触发抽屉)=====
const isMobile = ref(false)
const drawerVisible = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  // 进入桌面态时收起抽屉
  if (!isMobile.value) drawerVisible.value = false
}

function onHamburger() {
  drawerVisible.value = true
}

let resizeTimer = null
function onWindowResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(checkMobile, 120)
}

// 抽屉里点击菜单项后自动关闭
function onMenuSelect() {
  if (isMobile.value) drawerVisible.value = false
}

function logout() { auth.logout(); router.push('/login') }

// ===== 通知铃铛 =====
const unreadCount = ref(0)
const recentNotifs = ref([])
const bellPopover = ref(false)
let pollTimer = null

async function fetchUnreadCount() {
  try {
    const res = await notificationsApi.unreadCount()
    unreadCount.value = res.count ?? res ?? 0
  } catch { /* silent */ }
}

async function fetchRecentNotifs() {
  try {
    const res = await notificationsApi.list({ page: 1, pageSize: 5 })
    recentNotifs.value = res.items || res
  } catch { recentNotifs.value = [] }
}

async function onBellClick() {
  await fetchRecentNotifs()
}

function viewAllNotifs() {
  bellPopover.value = false
  router.push('/notifications')
}

function formatNotifTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN')
}

const TYPE_TAG = {
  system: 'info',
  reminder: 'warning',
  approval: 'success',
  report: '',
}

onMounted(() => {
  fetchUnreadCount()
  pollTimer = setInterval(fetchUnreadCount, 60000)
  checkMobile()
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  window.removeEventListener('resize', onWindowResize)
  clearTimeout(resizeTimer)
})
</script>

<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside" :class="{ 'aside--mobile-hidden': isMobile }">
      <div class="brand">
        <span v-show="!collapsed" class="brand-text">科研成果管理系统</span>
      </div>

      <el-menu :default-active="activeMenu" :collapse="collapsed" router class="menu" @select="onMenuSelect">
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

        <el-sub-menu index="workflow">
          <template #title><el-icon><Tickets /></el-icon><span>工作流</span></template>
          <el-menu-item index="/approvals"><el-icon><Checked /></el-icon><span>审批管理</span></el-menu-item>
          <el-menu-item index="/notifications"><el-icon><Notification /></el-icon><span>通知中心</span></el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="data">
          <template #title><el-icon><PieChart /></el-icon><span>数据</span></template>
          <el-menu-item index="/reports"><el-icon><PieChart /></el-icon><span>报表中心</span></el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/audit-logs"><el-icon><List /></el-icon><span>操作日志</span></el-menu-item>

        <el-sub-menu v-if="isSysAdmin" index="sys">
          <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
          <el-menu-item index="/users"><el-icon><Setting /></el-icon><span>用户管理</span></el-menu-item>
          <el-menu-item index="/departments"><el-icon><Setting /></el-icon><span>部门管理</span></el-menu-item>
          <el-menu-item index="/dictionaries"><el-icon><Setting /></el-icon><span>数据字典</span></el-menu-item>
          <el-menu-item index="/integrations"><el-icon><Setting /></el-icon><span>接口配置</span></el-menu-item>
          <el-menu-item index="/rbac"><el-icon><Lock /></el-icon><span>RBAC权限</span></el-menu-item>
          <el-menu-item index="/backup"><el-icon><FolderChecked /></el-icon><span>备份管理</span></el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon v-if="isMobile" class="collapse-btn" @click="onHamburger">
            <Fold />
          </el-icon>
          <el-icon v-else class="collapse-btn" @click="collapsed = !collapsed">
            <component :is="collapsed ? Expand : Fold" />
          </el-icon>
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <!-- 通知铃铛 -->
          <el-popover
            ref="bellPopover"
            :width="320"
            trigger="click"
            @show="onBellClick"
          >
            <template #reference>
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="bell-badge">
                <el-icon class="bell-icon"><Bell /></el-icon>
              </el-badge>
            </template>
            <div class="notif-popover">
              <div class="notif-popover-header">
                <span class="notif-popover-title">通知</span>
                <el-button link size="small" @click="viewAllNotifs">查看全部</el-button>
              </div>
              <div class="notif-popover-list" v-if="recentNotifs.length > 0">
                <div v-for="item in recentNotifs" :key="item.id" class="notif-popover-item">
                  <div class="notif-popover-item-header">
                    <el-tag :type="TYPE_TAG[item.messageType] || 'info'" size="small">
                      {{ item.messageType === 'system' ? '系统' : item.messageType === 'reminder' ? '提醒' : item.messageType === 'approval' ? '审批' : item.messageType === 'report' ? '报表' : item.messageType }}
                    </el-tag>
                    <span class="notif-popover-time">{{ formatNotifTime(item.createTime) }}</span>
                  </div>
                  <div class="notif-popover-text">{{ item.title }}</div>
                </div>
              </div>
              <div v-else class="notif-popover-empty">暂无通知</div>
            </div>
          </el-popover>

          <span class="user">{{ auth.user?.realName || auth.user?.username }} · {{ auth.user?.role }}</span>
          <el-button link size="small" style="margin-left:12px" @click="logout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <router-view :key="route.path" />
      </el-main>
    </el-container>

    <!-- 移动端抽屉式侧栏(<768px 触发) -->
    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="240px"
      :with-header="true"
      title="菜单"
      class="mobile-drawer"
    >
      <el-menu :default-active="activeMenu" router class="drawer-menu" @select="onMenuSelect">
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

        <el-sub-menu index="workflow">
          <template #title><el-icon><Tickets /></el-icon><span>工作流</span></template>
          <el-menu-item index="/approvals"><el-icon><Checked /></el-icon><span>审批管理</span></el-menu-item>
          <el-menu-item index="/notifications"><el-icon><Notification /></el-icon><span>通知中心</span></el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="data">
          <template #title><el-icon><PieChart /></el-icon><span>数据</span></template>
          <el-menu-item index="/reports"><el-icon><PieChart /></el-icon><span>报表中心</span></el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/audit-logs"><el-icon><List /></el-icon><span>操作日志</span></el-menu-item>

        <el-sub-menu v-if="isSysAdmin" index="sys">
          <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
          <el-menu-item index="/users"><el-icon><Setting /></el-icon><span>用户管理</span></el-menu-item>
          <el-menu-item index="/departments"><el-icon><Setting /></el-icon><span>部门管理</span></el-menu-item>
          <el-menu-item index="/dictionaries"><el-icon><Setting /></el-icon><span>数据字典</span></el-menu-item>
          <el-menu-item index="/integrations"><el-icon><Setting /></el-icon><span>接口配置</span></el-menu-item>
          <el-menu-item index="/rbac"><el-icon><Lock /></el-icon><span>RBAC权限</span></el-menu-item>
          <el-menu-item index="/backup"><el-icon><FolderChecked /></el-icon><span>备份管理</span></el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-drawer>
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
.header-right { display: flex; align-items: center; gap: 8px; }
.user { font-size: 13px; color: var(--text-regular); }
.main { background: var(--bg-page); padding: 16px; }

/* 铃铛 */
.bell-badge { cursor: pointer; }
.bell-icon { font-size: 18px; color: var(--text-regular); cursor: pointer; }
.bell-icon:hover { color: var(--el-color-primary); }

/* 通知弹出框 */
.notif-popover { }
.notif-popover-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.notif-popover-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.notif-popover-list { display: flex; flex-direction: column; gap: 8px; }
.notif-popover-item { padding: 6px 0; border-bottom: 1px solid var(--border-color); cursor: pointer; }
.notif-popover-item:last-child { border-bottom: none; }
.notif-popover-item-header { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.notif-popover-time { font-size: 11px; color: var(--text-secondary); margin-left: auto; }
.notif-popover-text { font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notif-popover-empty { text-align: center; color: var(--text-secondary); padding: 20px 0; font-size: 13px; }

/* ===== 响应式:<768px 隐藏常驻侧栏,内容区全宽,顶栏紧凑 ===== */
@media (max-width: 768px) {
  .aside--mobile-hidden {
    display: none;
  }
  .header {
    padding: 0 12px;
  }
  .user {
    display: none; /* 窄屏隐藏用户信息,腾出空间给铃铛和退出 */
  }
  .main {
    padding: 10px;
  }
}

/* 移动端抽屉内菜单(el-drawer 会被传送到 body,需要 :deep 穿透 scoped) */
.drawer-menu { border-right: none; }
.drawer-menu :deep(.el-menu-item) { position: relative; }
.drawer-menu :deep(.el-menu-item.is-active) { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
</style>
