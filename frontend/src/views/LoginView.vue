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
  <div class="login-page">
    <div class="card">
      <div class="brand">
        <div class="brand-mark">科</div>
        <div class="brand-text">科研成果管理系统</div>
      </div>

      <div class="title">登录</div>
      <div class="subtitle">请输入账号继续</div>

      <el-form class="form" @submit.prevent="handleLogin">
        <label class="field-label">用户名</label>
        <el-input
          v-model="form.username"
          size="large"
          placeholder="用户名"
          autocomplete="username"
          @keyup.enter="handleLogin"
        />

        <label class="field-label" style="margin-top: 18px">密码</label>
        <el-input
          v-model="form.password"
          size="large"
          type="password"
          placeholder="密码"
          show-password
          autocomplete="current-password"
          @keyup.enter="handleLogin"
        />

        <el-button
          type="primary"
          size="large"
          class="submit"
          :loading="loading"
          @click="handleLogin"
        >登 录</el-button>
      </el-form>

      <div class="hint">
        默认管理员：<code>admin</code> / <code>Admin@123</code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 40px 36px 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
}
.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 28px;
}

.field-label {
  display: block;
  font-size: 13px;
  color: var(--text-regular);
  margin-bottom: 6px;
}

.submit {
  width: 100%;
  margin-top: 24px;
  letter-spacing: 4px;
}

.hint {
  margin-top: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
.hint code {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  color: var(--text-regular);
}
</style>
