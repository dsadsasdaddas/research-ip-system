import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn' // Element Plus 组件中文化
import App from './App.vue'
import router from './router'

// 创建 Vue 应用,挂上 UI 组件库和路由,再渲染到页面的 #app 节点
const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')
