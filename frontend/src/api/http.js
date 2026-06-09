import axios from 'axios'

// 统一的 axios 实例:所有请求都走 /api 前缀,由 Vite 代理转发到后端 3001。
const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器:自动带上 JWT token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// 响应拦截器:成功时只把 data 给业务代码;失败时把后端的错误信息整理成一句话再抛出。
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // 后端校验失败时 message 可能是数组,拼成一行更好读
    const msg = err.response?.data?.message || err.message || '请求失败'
    return Promise.reject(new Error(Array.isArray(msg) ? msg.join('; ') : msg))
  },
)

export default http
