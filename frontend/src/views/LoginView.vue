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

// 当前年份的罗马数字（仅用作版式装饰，与本年无强绑定）
const now = new Date()
const year = now.getFullYear()
function toRoman(n) {
  const m = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]]
  let s = ''
  for (const [r, v] of m) { while (n >= v) { s += r; n -= v } }
  return s
}
const romanYear = toRoman(year)
const monthRoman = toRoman(now.getMonth() + 1)
</script>

<template>
  <div class="login-page">
    <div class="page-frame">

      <!-- ============ 顶部元数据带 ============ -->
      <header class="meta-band">
        <div class="meta-left">
          <div class="meta-title">ACADEMIA SCIENTIFICA · 中国研究院</div>
          <div class="meta-sub">REGISTRY OF AUTHORED WORKS · INTELLECTUAL PROPERTY</div>
        </div>
        <div class="meta-right">
          <div class="meta-title">VOL.&nbsp;XII · No.&nbsp;{{ monthRoman }} · {{ romanYear }}</div>
          <div class="meta-sub">ACCESS CONTROL · FOLIO I OF I</div>
        </div>
      </header>

      <hr class="hairline" />

      <!-- ============ 刊头 ============ -->
      <section class="masthead">
        <div class="eyebrow">EST. MCMLVIII · A REGISTRY FOR AUTHORED WORKS</div>
        <h1 class="masthead-title">
          <span class="line">科研成果与知识产权</span>
          <span class="line spaced">管 理 系 统</span>
        </h1>
        <div class="undertitle">Registry of Research Output &amp; Intellectual Property</div>
        <div class="accent-rule"></div>
      </section>

      <hr class="hairline" />

      <!-- ============ 主体：左表单 / 右版权页 ============ -->
      <main class="body">

        <!-- § I —— 表单 -->
        <section class="form-col">
          <div class="section-mark">§&nbsp;I.&nbsp;&nbsp;AUTHENTICATION</div>

          <form class="cg-form" @submit.prevent="handleLogin">
            <label class="cg-field">
              <span class="cg-label">USERNAME&nbsp;&nbsp;/&nbsp;&nbsp;用户名</span>
              <input
                v-model="form.username"
                class="cg-input"
                type="text"
                autocomplete="username"
                spellcheck="false"
                @keyup.enter="handleLogin"
              />
            </label>

            <label class="cg-field">
              <span class="cg-label">PASSWORD&nbsp;&nbsp;/&nbsp;&nbsp;口令</span>
              <input
                v-model="form.password"
                class="cg-input"
                type="password"
                autocomplete="current-password"
                @keyup.enter="handleLogin"
              />
            </label>

            <button
              type="submit"
              class="cg-action"
              :class="{ 'is-loading': loading }"
              :disabled="loading"
            >
              <span>{{ loading ? 'AUTHENTICATING' : 'ENTER THE REGISTRY' }}</span>
              <svg class="arrow" viewBox="0 0 24 8" aria-hidden="true">
                <line x1="0" y1="4" x2="20" y2="4" stroke="currentColor" stroke-width="0.8" />
                <polyline points="16,1 20,4 16,7" fill="none" stroke="currentColor" stroke-width="0.8" />
              </svg>
            </button>
          </form>
        </section>

        <!-- § II —— 版权 / 元信息 -->
        <aside class="colophon-col">
          <div class="section-mark">§&nbsp;II.&nbsp;&nbsp;COLOPHON</div>
          <dl class="colophon">
            <div class="row"><dt>SYSTEM</dt><dd>RESEARCH MIS · v0.7</dd></div>
            <div class="row"><dt>SET&nbsp;IN</dt><dd>SOURCE HAN SERIF · GARAMOND</dd></div>
            <div class="row"><dt>RULES</dt><dd>0.5&nbsp;PT&nbsp;GRAPHITE</dd></div>
            <div class="row"><dt>PAPER</dt><dd>#FAF8F3</dd></div>
            <div class="row"><dt>ACCENT</dt><dd>STEEL&nbsp;BLUE · #3B5B8C</dd></div>
            <div class="row"><dt>GRID</dt><dd>XII · MODULAR · OCTAVE</dd></div>
            <div class="row"><dt>ROLES</dt><dd>VII · SEE FOLIO II</dd></div>
          </dl>
          <div class="default-card">
            <div class="dc-label">DEFAULT&nbsp;CREDENTIAL</div>
            <div class="dc-value">admin&nbsp;·&nbsp;Admin@123</div>
          </div>
        </aside>
      </main>

      <hr class="hairline" />

      <!-- ============ 底栏 ============ -->
      <footer class="foot">
        <div class="foot-left">DESIGN · CITATION GEOMETRY · A. D. {{ romanYear }}</div>
        <div class="foot-right">PRESS · COWORK STUDIO · BEIJING</div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ============ 页面基底 ============ */
.login-page {
  min-height: 100vh;
  background: #faf8f3;
  /* 极淡的纸张暖角晕 */
  background-image:
    radial-gradient(ellipse at center, transparent 55%, rgba(155,138,98,0.10) 100%);
  color: #1f2329;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 40px;
  font-family: 'EB Garamond', 'Source Han Serif SC', 'Noto Serif CJK SC',
               'Songti SC', 'Times New Roman', Georgia, serif;
  -webkit-font-smoothing: antialiased;
}

.page-frame {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

/* ============ 通用 hairline ============ */
.hairline {
  border: 0;
  border-top: 0.5px solid #1f2329;
  margin: 0;
  height: 0;
}

/* ============ 顶部元数据带 ============ */
.meta-band {
  display: flex;
  justify-content: space-between;
  padding: 0 4px 14px;
}
.meta-band .meta-title {
  font-size: 11px;
  letter-spacing: 3.5px;
  font-weight: 400;
  color: #1f2329;
}
.meta-band .meta-sub {
  font-size: 10px;
  letter-spacing: 2.4px;
  color: #86909c;
  margin-top: 4px;
}
.meta-right { text-align: right; }

/* ============ 刊头 ============ */
.masthead {
  text-align: center;
  padding: 78px 0 70px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 6px;
  color: #4e5969;
  margin-bottom: 36px;
}
.masthead-title {
  margin: 0;
  font-weight: 400;
  font-size: 62px;
  line-height: 1.25;
  letter-spacing: 14px;
  color: #1f2329;
}
.masthead-title .line { display: block; }
.masthead-title .line.spaced { letter-spacing: 22px; }
.undertitle {
  margin-top: 22px;
  font-style: italic;
  font-size: 18px;
  letter-spacing: 1.4px;
  color: #4e5969;
}
.accent-rule {
  width: 64px;
  height: 1.6px;
  background: #3b5b8c;
  margin: 28px auto 0;
}

/* ============ 主体 ============ */
.body {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 96px;
  padding: 56px 4px 60px;
}

.section-mark {
  font-size: 10.5px;
  letter-spacing: 4.5px;
  color: #4e5969;
  margin-bottom: 44px;
}

/* ===== 表单 ===== */
.cg-form {
  max-width: 460px;
}
.cg-field {
  display: block;
  margin-bottom: 44px;
}
.cg-label {
  display: block;
  font-size: 10.5px;
  letter-spacing: 4px;
  color: #1f2329;
  margin-bottom: 10px;
}
.cg-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 0.8px solid #1f2329;
  border-radius: 0;
  padding: 6px 2px 10px;
  font-family: inherit;
  font-size: 22px;
  letter-spacing: 1px;
  color: #1f2329;
  outline: none;
  caret-color: #3b5b8c;
  transition: border-color 0.25s ease;
}
.cg-input:focus {
  border-bottom-color: #3b5b8c;
}
.cg-input::placeholder { color: #c4c8ce; }

.cg-action {
  margin-top: 18px;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  background: transparent;
  border: none;
  padding: 8px 0;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 6px;
  color: #3b5b8c;
  cursor: pointer;
  transition: opacity 0.2s ease, letter-spacing 0.25s ease;
}
.cg-action:hover {
  letter-spacing: 7.5px;
}
.cg-action:disabled,
.cg-action.is-loading {
  cursor: progress;
  opacity: 0.55;
}
.cg-action .arrow {
  width: 26px;
  height: 8px;
  flex-shrink: 0;
}

/* ===== 版权 / 元信息 ===== */
.colophon-col {
  border-left: 0.5px solid #e6e8eb;
  padding-left: 56px;
}
.colophon {
  margin: 0;
}
.colophon .row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  font-size: 11px;
  letter-spacing: 1px;
  color: #4e5969;
  border-bottom: 0.5px dotted #d8d4c7;
}
.colophon .row:last-of-type { border-bottom: none; }
.colophon dt {
  font-size: 10.5px;
  letter-spacing: 3.5px;
  color: #1f2329;
}
.colophon dd {
  margin: 0;
  font-size: 11.5px;
  letter-spacing: 0.6px;
  color: #4e5969;
}

.default-card {
  margin-top: 36px;
  padding: 14px 16px;
  border: 0.5px solid #1f2329;
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
}
.dc-label {
  font-size: 9.5px;
  letter-spacing: 3.5px;
  color: #4e5969;
}
.dc-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  letter-spacing: 1px;
  color: #1f2329;
}

/* ============ 底栏 ============ */
.foot {
  display: flex;
  justify-content: space-between;
  padding: 16px 4px 0;
  font-size: 10px;
  letter-spacing: 2.5px;
  color: #86909c;
}

/* ============ 响应式 ============ */
@media (max-width: 960px) {
  .login-page { padding: 32px 22px; }
  .masthead { padding: 48px 0 40px; }
  .masthead-title { font-size: 38px; letter-spacing: 8px; }
  .masthead-title .line.spaced { letter-spacing: 14px; }
  .undertitle { font-size: 14px; }
  .body { grid-template-columns: 1fr; gap: 56px; padding: 36px 0 40px; }
  .colophon-col { border-left: 0; padding-left: 0; border-top: 0.5px solid #e6e8eb; padding-top: 36px; }
  .meta-band { flex-direction: column; gap: 10px; }
  .meta-right { text-align: left; }
}
</style>
