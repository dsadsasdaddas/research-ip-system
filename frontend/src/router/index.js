import { createRouter, createWebHistory } from 'vue-router'
import PaperList from '../views/PaperList.vue'

// 路由表:目前只有论文列表页;根路径重定向到它
const routes = [
  { path: '/', redirect: '/papers' },
  {
    path: '/papers',
    name: 'papers',
    component: PaperList,
    meta: { title: '论文管理' },
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
