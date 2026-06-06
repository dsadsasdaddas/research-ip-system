import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 配置:开发服务器 + 后端代理
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // 前端发往 /api/xxx 的请求,统一转发到后端 http://localhost:3001/api/xxx。
      // 好处:浏览器看来是同源,绕开跨域;前端代码里不用写死后端端口。
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
