import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import ResourcePage from '../components/ResourcePage.vue'
import Placeholder from '../views/Placeholder.vue'
import paper from '../modules/paper'
import patent from '../modules/patent'
import copyright from '../modules/copyright'

// 路由表:所有页面都挂在 AppLayout 布局壳下(共用侧栏+顶栏)。
// 论文/专利/软著三类成果都用同一个通用组件 ResourcePage 渲染,
// 各自的差异通过 props 把对应的字段配置传进去(配置见 modules/*.js)。
// 其余模块暂用占位页,保证整体骨架完整。
const routes = [
  {
    path: '/',
    component: AppLayout,
    redirect: '/papers',
    children: [
      { path: 'papers', component: ResourcePage, props: paper, meta: { title: '论文管理' } },
      { path: 'patents', component: ResourcePage, props: patent, meta: { title: '专利管理' } },
      { path: 'copyrights', component: ResourcePage, props: copyright, meta: { title: '软件著作权' } },
      { path: 'dashboard', component: Placeholder, meta: { title: '统计看板' } },
      { path: 'reminders', component: Placeholder, meta: { title: '申报提醒' } },
      { path: 'search', component: Placeholder, meta: { title: '全文检索' } },
      { path: 'settings', component: Placeholder, meta: { title: '系统设置' } },
    ],
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
