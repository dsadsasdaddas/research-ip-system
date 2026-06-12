import { defineStore } from 'pinia'

/**
 * 轻量级列表状态持久化(仅内存,跨导航保留)。
 * 让论文/专利/软著/转化四个通用列表页,在离开再回来时恢复分页与搜索关键字。
 *
 * 数据结构:resourceName -> { keyword, page, pageSize }
 * 用法:
 *   const store = useResourceListStore()
 *   store.get('papers')            // 读取或返回 null
 *   store.set('papers', { ... })   // 覆盖保存
 */
export const useResourceListStore = defineStore('resourceList', {
  state: () => ({
    map: {},
  }),
  actions: {
    get(key) {
      return this.map[key] || null
    },
    set(key, value) {
      this.map[key] = { ...value }
    },
    clear(key) {
      delete this.map[key]
    },
  },
})
