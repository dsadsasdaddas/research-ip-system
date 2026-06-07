import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '../api/http'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user  = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const role       = computed(() => user.value?.role || '')
  const deptId     = computed(() => user.value?.deptId || null)

  // 角色判断
  const isSysAdmin  = computed(() => role.value === 'sys_admin')
  const isLeader    = computed(() => ['leader', 'sys_admin', 'auditor'].includes(role.value))

  async function login(username, password) {
    const res = await http.post('/auth/login', { username, password })
    token.value = res.token
    user.value  = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
  }

  function logout() {
    token.value = ''
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isLoggedIn, role, deptId, isSysAdmin, isLeader, login, logout }
})
