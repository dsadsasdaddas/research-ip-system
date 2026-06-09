import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import ResourcePage from '../components/ResourcePage.vue'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import FeesView from '../views/FeesView.vue'
import RemindersView from '../views/RemindersView.vue'
import SearchView from '../views/SearchView.vue'
import AuditLogView from '../views/AuditLogView.vue'
import paper from '../modules/paper'
import patent from '../modules/patent'
import copyright from '../modules/copyright'
import transform from '../modules/transform'

const routes = [
  { path: '/login', component: LoginView, meta: { public: true } },
  {
    path: '/',
    component: AppLayout,
    redirect: '/papers',
    children: [
      { path: 'papers',     component: ResourcePage, props: paper,     meta: { title: '论文管理' } },
      { path: 'patents',    component: ResourcePage, props: patent,    meta: { title: '专利管理' } },
      { path: 'copyrights', component: ResourcePage, props: copyright, meta: { title: '软件著作权' } },
      { path: 'transforms', component: ResourcePage, props: transform, meta: { title: '成果转化' } },
      { path: 'fees',       component: FeesView,     meta: { title: '费用管理' } },
      { path: 'reminders',  component: RemindersView,meta: { title: '申报提醒' } },
      { path: 'search',     component: SearchView,   meta: { title: '全文检索' } },
      { path: 'dashboard',  component: DashboardView,meta: { title: '统计看板' } },
      { path: 'audit-logs', component: AuditLogView, meta: { title: '操作日志' } },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) return '/login'
})

export default router
