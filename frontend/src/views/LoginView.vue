<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const auth   = useAuthStore()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    router.push('/')
  } catch (e) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-root">

    <!-- 左侧品牌区 -->
    <div class="brand-panel">
      <div class="brand-inner">
        <div class="brand-logo">科</div>
        <h1 class="brand-title">科研成果与知识产权<br>管理系统</h1>
        <p class="brand-desc">全生命周期管理 · 智能登记 · 多维统计</p>

        <div class="brand-stats">
          <div class="bs-item">
            <span class="bs-num">3</span>
            <span class="bs-label">成果类型</span>
          </div>
          <div class="bs-divider"></div>
          <div class="bs-item">
            <span class="bs-num">6</span>
            <span class="bs-label">统计看板</span>
          </div>
          <div class="bs-divider"></div>
          <div class="bs-item">
            <span class="bs-num">7</span>
            <span class="bs-label">权限角色</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="form-panel">
      <div class="form-inner">
        <div class="form-header">
          <h2>欢迎回来</h2>
          <p>请使用您的账号登录系统</p>
        </div>

        <el-form class="login-form" @submit.prevent="handleLogin">
          <div class="field-label">用户名</div>
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            @keyup.enter="handleLogin"
          />

          <div class="field-label" style="margin-top: 20px">密码</div>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />

          <el-button
            type="primary"
            size="large"
            style="width: 100%; margin-top: 28px; height: 44px; font-size: 15px; letter-spacing: 2px"
            :loading="loading"
            @click="handleLogin"
          >登 录</el-button>
        </el-form>

        <p class="hint-text">默认管理员账号：<code>admin</code> / <code>Admin@123</code></p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.login-root {
  display: flex;
  height: 100vh;
  background: var(--bg-page);
}

/* ===== 左侧品牌区 ===== */
.brand-panel {
  flex: 1;
  background: #1e3356;   /* 比主色更深的导航蓝，沉稳大气 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 56px;
}
.brand-inner {
  max-width: 380px;
}
.brand-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}
.brand-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  line-height: 1.4;
  margin: 0 0 14px;
}
.brand-desc {
  font-size: 14px;
  color: rgba(255,255,255,0.55);
  margin: 0 0 48px;
  letter-spacing: 0.5px;
}
.brand-stats {
  display: flex;
  align-items: center;
  gap: 0;
  border-top: 1px solid rgba(255,255,255,0.12);
  padding-top: 32px;
}
.bs-item {
  flex: 1;
  text-align: center;
}
.bs-num {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 6px;
}
.bs-label {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}
.bs-divider {
  width: 1px;
  height: 40px;
  background: rgba(255,255,255,0.15);
}

/* ===== 右侧表单区 ===== */
.form-panel {
  width: 480px;
  flex-shrink: 0;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 56px;
  box-shadow: -1px 0 0 var(--border-color);
}
.form-inner {
  width: 100%;
  max-width: 340px;
}
.form-header {
  margin-bottom: 36px;
}
.form-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.form-header p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-regular);
  margin-bottom: 8px;
}
.hint-text {
  margin-top: 24px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
.hint-text code {
  background: var(--bg-page);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
  color: var(--text-regular);
}
</style>
