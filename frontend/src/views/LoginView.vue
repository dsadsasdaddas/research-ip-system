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
      <div class="title">科研成果管理系统</div>
      <div class="subtitle">请使用您的账号登录</div>

      <el-form class="form" @submit.prevent="handleLogin">
        <label class="field-label">用户名</label>
        <el-input
          v-model="form.username"
          size="large"
          placeholder="用户名"
          autocomplete="username"
          @keyup.enter="handleLogin"
        />

        <label class="field-label">密码</label>
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
  padding: 60px 24px;
}

.card {
  width: 100%;
  max-width: 460px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 72px 64px 56px;
}

.title {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-primary);
  margin-bottom: 12px;
  text-align: center;
}
.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 56px;
}

.field-label {
  display: block;
  font-size: 13px;
  color: var(--text-regular);
  margin: 22px 0 8px;
}
.field-label:first-of-type {
  margin-top: 0;
}

.submit {
  width: 100%;
  margin-top: 40px;
  height: 46px;
  font-size: 15px;
  letter-spacing: 6px;
}

.hint {
  margin-top: 36px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
.hint code {
  background: var(--bg-muted);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 11px;
  color: var(--text-regular);
}

@media (max-width: 520px) {
  .card { padding: 48px 32px 40px; }
  .title { font-size: 24px; }
  .subtitle { margin-bottom: 36px; }
}
</style>
