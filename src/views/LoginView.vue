<template>
  <div class="auth-root" :class="{ light: isLight }">
    <div class="auth-left">
      <div class="auth-logo">
        <img :src="isLight ? '/logo.png' : '/logo.png'" alt="KinyaBot" class="logo-img" :class="{ 'logo-light': isLight }" />
        <span class="logo-text">KinyaBot</span>
      </div>

      <div class="auth-form-wrap">
        <h1 class="auth-heading">Welcome back! 👋</h1>
        <p class="auth-sub">Log in to KinyaBot to continue your AI journey.</p>

        <!-- Show forgot password form inline -->
        <div v-if="showForgot">
          <div class="back-link" @click="showForgot=false">
            <i class="fas fa-arrow-left"></i> Back to login
          </div>
          <h2 class="sub-heading">Reset your password</h2>
          <p class="auth-sub">Enter your email and we'll send you a reset link.</p>
          <div class="field">
            <label class="field-label">Email address</label>
            <input v-model="forgotEmail" type="email" class="field-input" placeholder="your@email.com" @keyup.enter="handleForgot" />
          </div>
          <div v-if="forgotMsg" class="notice" :class="forgotMsg.type">
            <i :class="forgotMsg.type==='ok'?'fas fa-check-circle':'fas fa-circle-exclamation'"></i>
            {{ forgotMsg.text }}
          </div>
          <button class="submit-btn" :disabled="forgotLoading" @click="handleForgot">
            <i v-if="forgotLoading" class="fas fa-spinner fa-spin"></i>
            {{ forgotLoading ? 'Sending…' : 'Send Reset Link' }}
          </button>
        </div>

        <form v-else @submit.prevent="handleLogin" novalidate>
          <div class="social-btns">
            <button type="button" class="social-btn" @click="showOAuth('Google')">
              <i class="fab fa-google"></i><span>Continue with Google</span>
            </button>
            <button type="button" class="social-btn" @click="showOAuth('Apple')">
              <i class="fab fa-apple"></i><span>Continue with Apple</span>
            </button>
          </div>

          <!-- OAuth coming soon toast -->
          <transition name="fade">
            <div v-if="oauthToast" class="oauth-toast">
              <i class="fas fa-circle-info"></i>
              <span>{{ oauthToast }} OAuth is coming soon! Use email login for now.</span>
            </div>
          </transition>
          <div class="divider"><span>OR</span></div>

          <div class="field">
            <label class="field-label">Email</label>
            <input v-model="form.email" type="email" class="field-input" :class="{error:errors.email}" placeholder="your@email.com" autocomplete="email" />
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          </div>

          <div class="field">
            <div class="field-header">
              <label class="field-label">Password</label>
              <span class="forgot-link" @click="$router.push('/forgot-password')">Forgot password?</span>
            </div>
            <div class="pass-wrap">
              <input v-model="form.password" :type="showPass?'text':'password'" class="field-input" :class="{error:errors.password}" placeholder="••••••••" autocomplete="current-password" />
              <button type="button" class="eye-btn" @click="showPass=!showPass">
                <i :class="showPass?'far fa-eye-slash':'far fa-eye'"></i>
              </button>
            </div>
            <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          </div>

          <!-- Remember me -->
          <div class="remember-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="rememberMe" />
              <span class="checkmark"></span>
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <div v-if="serverError" class="notice error-notice">
            <i class="fas fa-circle-exclamation"></i> {{ serverError }}
          </div>

          <button type="submit" class="submit-btn" :disabled="loading">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            {{ loading ? 'Logging in…' : 'Log in' }}
          </button>
        </form>

        <p class="switch-text">
          Don't have an account? <router-link to="/register">Create one</router-link>
        </p>
      </div>
    </div>

    <div class="auth-right">
      <div class="hero-content">
        <h2 class="hero-headline">Your AI,<br /><span class="g-text">Always Ready.</span></h2>
        <p class="hero-desc">Powered by advanced AI to answer anything, generate code, images, and more — in Kinyarwanda and beyond.</p>
        <div class="hero-stats">
          <div class="stat"><span class="stat-num">10K+</span><span class="stat-lbl">Users</span></div>
          <div class="stat-divider"></div>
          <div class="stat"><span class="stat-num">1M+</span><span class="stat-lbl">Messages</span></div>
          <div class="stat-divider"></div>
          <div class="stat"><span class="stat-num">99.9%</span><span class="stat-lbl">Uptime</span></div>
        </div>
      </div>
      <div class="hero-deco">
        <div class="deco-ring ring1"></div>
        <div class="deco-ring ring2"></div>
        <div class="deco-cube">
          <img src="/logo.png" alt="" class="deco-logo" :class="{'logo-light':isLight}" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const loading = ref(false)
const showPass = ref(false)
const rememberMe = ref(false)
const serverError = ref('')
const showForgot = ref(false)
const forgotEmail = ref('')
const forgotLoading = ref(false)
const forgotMsg = ref(null)
const oauthToast = ref('')

async function showOAuth(provider) {
  if (provider === 'Google') {
    serverError.value = ''; loading.value = true
    try {
      const result = await auth.loginWithGoogle()
      if (!result.user.onboarded) router.push('/onboarding')
      else router.push('/chat')
    } catch (err) {
      serverError.value = err.response?.data?.error || 'Google login failed. Please try again.'
    } finally { loading.value = false }
  } else {
    oauthToast.value = provider
    setTimeout(() => { oauthToast.value = '' }, 3500)
  }
}

// Detect system theme
const isLight = computed(() => document.documentElement.classList.contains('light-mode'))

function validate() {
  errors.email = ''; errors.password = ''
  let ok = true
  if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) { errors.email = 'Enter a valid email'; ok = false }
  if (!form.password || form.password.length < 6) { errors.password = 'At least 6 characters'; ok = false }
  return ok
}

async function handleLogin() {
  if (!validate()) return
  serverError.value = ''; loading.value = true
  try {
    const result = await auth.login(form.email, form.password, rememberMe.value)
    if (!result.user.onboarded) router.push('/onboarding')
    else router.push('/chat')
  } catch (err) {
    serverError.value = err.response?.data?.error || 'Login failed. Please try again.'
  } finally { loading.value = false }
}

async function handleForgot() {
  if (!forgotEmail.value) return
  forgotLoading.value = true; forgotMsg.value = null
  try {
    await auth.forgotPassword(forgotEmail.value)
    forgotMsg.value = { type: 'ok', text: 'If that email exists, a reset link has been sent. Check your inbox.' }
  } catch { forgotMsg.value = { type: 'err', text: 'Something went wrong. Please try again.' } }
  finally { forgotLoading.value = false }
}
</script>

<style scoped>
.auth-root { display:flex; height:100vh; width:100vw; overflow:hidden; background:#0d0d0f; transition:background .3s; }
.auth-root.light { background:#f0f2f5; }

.auth-left { width:460px; min-width:460px; display:flex; flex-direction:column; padding:2rem 2.5rem; background:#111112; overflow-y:auto; transition:background .3s; }
.auth-root.light .auth-left { background:#ffffff; box-shadow:4px 0 20px rgba(0,0,0,.06); }

.auth-logo { display:flex; align-items:center; gap:10px; margin-bottom:2.25rem; }
.logo-img { width:36px; height:36px; border-radius:9px; object-fit:cover; }
.logo-img.logo-light { filter:none; }
.logo-text { font-size:1.15rem; font-weight:700; color:var(--text-1); }
.auth-root.light .logo-text { color:#1a1a2e; }

.auth-form-wrap { flex:1; display:flex; flex-direction:column; justify-content:center; max-width:370px; }
.auth-heading { font-size:1.7rem; font-weight:700; color:#fff; margin-bottom:5px; }
.auth-root.light .auth-heading { color:#1a1a2e; }
.sub-heading { font-size:1.2rem; font-weight:600; color:#fff; margin-bottom:.5rem; }
.auth-root.light .sub-heading { color:#1a1a2e; }
.auth-sub { font-size:13px; color:var(--text-2); margin-bottom:1.5rem; }
.auth-root.light .auth-sub { color:#5f6368; }

.back-link { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--blue); cursor:pointer; margin-bottom:1.25rem; font-weight:500; }
.back-link:hover { text-decoration:underline; }

.social-btns { display:flex; flex-direction:column; gap:9px; margin-bottom:1.1rem; }
.social-btn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:10px 16px; background:#1e1f20; border:1px solid var(--border-md); border-radius:var(--r-sm); color:var(--text-1); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.auth-root.light .social-btn { background:#f8f9fa; border-color:#e0e0e0; color:#202124; }
.social-btn:hover { background:var(--bg-hover); }
.auth-root.light .social-btn:hover { background:#e8eaed; }
.fa-google { color:#ea4335; } .fa-apple { color:#fff; }
.auth-root.light .fa-apple { color:#000; }

.divider { display:flex; align-items:center; gap:10px; color:var(--text-3); font-size:12px; margin-bottom:1.1rem; }
.divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--border-md); }
.auth-root.light .divider { color:#9aa0a6; }
.auth-root.light .divider::before,.auth-root.light .divider::after { background:#e0e0e0; }

.field { margin-bottom:.9rem; }
.field-label { display:block; font-size:13px; font-weight:500; color:var(--text-2); margin-bottom:5px; }
.auth-root.light .field-label { color:#5f6368; }
.field-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
.forgot-link { font-size:12.5px; color:var(--blue); cursor:pointer; }
.forgot-link:hover { text-decoration:underline; }

.field-input { width:100%; padding:10px 13px; background:#1a1a1c; border:1px solid var(--border-md); border-radius:var(--r-sm); color:var(--text-1); font-size:13.5px; transition:border-color .2s,box-shadow .2s; outline:none; }
.auth-root.light .field-input { background:#f8f9fa; border-color:#dadce0; color:#202124; }
.field-input::placeholder { color:var(--text-3); }
.field-input:focus { border-color:#6d28d9; box-shadow:0 0 0 3px rgba(109,40,217,.18); }
.field-input.error { border-color:var(--red); }
.field-error { font-size:11.5px; color:var(--red); margin-top:3px; display:block; }

.pass-wrap { position:relative; }
.pass-wrap .field-input { padding-right:42px; }
.eye-btn { position:absolute; right:11px; top:50%; transform:translateY(-50%); background:none; color:var(--text-2); font-size:14px; padding:4px; transition:color .2s; }
.eye-btn:hover { color:var(--text-1); }

/* Remember me */
.remember-row { margin-bottom:1rem; }
.checkbox-label { display:flex; align-items:center; gap:9px; cursor:pointer; font-size:13px; color:var(--text-2); user-select:none; }
.auth-root.light .checkbox-label { color:#5f6368; }
.checkbox-label input[type=checkbox] { display:none; }
.checkmark { width:17px; height:17px; border:1.5px solid var(--border-md); border-radius:4px; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
.auth-root.light .checkmark { border-color:#dadce0; }
.checkbox-label input:checked + .checkmark { background:#6d28d9; border-color:#6d28d9; }
.checkbox-label input:checked + .checkmark::after { content:'✓'; color:#fff; font-size:11px; font-weight:700; }

.notice { padding:9px 12px; border-radius:var(--r-sm); font-size:12.5px; display:flex; align-items:center; gap:7px; margin-bottom:.9rem; }
.notice.ok { background:rgba(52,168,83,.1); border:1px solid rgba(52,168,83,.3); color:#34a853; }
.notice.err,.error-notice { background:rgba(242,139,130,.1); border:1px solid rgba(242,139,130,.25); color:var(--red); }

.submit-btn { width:100%; padding:11px; background:#3c3c42; border:1px solid rgba(255,255,255,.1); border-radius:var(--r-sm); color:var(--text-2); font-size:14px; font-weight:500; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:1.1rem; }
.auth-root.light .submit-btn { background:#e8eaed; border-color:#dadce0; color:#5f6368; }
.submit-btn:not(:disabled):hover { background:#6d28d9; border-color:#6d28d9; color:#fff; }
.submit-btn:disabled { opacity:.55; cursor:not-allowed; }

.switch-text { font-size:13px; color:var(--text-2); text-align:center; }
.auth-root.light .switch-text { color:#5f6368; }
.switch-text a { color:var(--blue); font-weight:500; }
.switch-text a:hover { text-decoration:underline; }

.oauth-toast {
  background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25);
  color: #c4b5fd; padding: 9px 12px; border-radius: var(--r-sm);
  font-size: 12.5px; display: flex; align-items: center; gap: 7px;
  margin-bottom: .9rem;
}
.auth-root.light .oauth-toast { background: rgba(99,102,241,.08); color: #6d28d9; }

.auth-right { flex:1; background:#0d0d0f; display:flex; align-items:center; justify-content:space-around; padding:3rem; position:relative; overflow:hidden; transition:background .3s; }
.auth-root.light .auth-right { background:#f0f2f5; }
.auth-right::before { content:''; position:absolute; inset:0; background-image:linear-gradient(rgba(109,40,217,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,.04) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; }

.hero-content { position:relative; z-index:2; max-width:360px; }
.hero-headline { font-size:clamp(1.5rem,2.8vw,2.3rem); font-weight:700; color:#fff; line-height:1.25; margin-bottom:1rem; }
.auth-root.light .hero-headline { color:#1a1a2e; }
.hero-desc { font-size:14px; color:var(--text-2); line-height:1.75; margin-bottom:2rem; }
.hero-stats { display:flex; align-items:center; gap:20px; }
.stat { display:flex; flex-direction:column; }
.stat-num { font-size:1.4rem; font-weight:700; color:#fff; }
.auth-root.light .stat-num { color:#1a1a2e; }
.stat-lbl { font-size:12px; color:var(--text-2); }
.stat-divider { width:1px; height:36px; background:var(--border-md); }

.hero-deco { position:relative; z-index:2; width:240px; height:240px; display:flex; align-items:center; justify-content:center; }
.deco-ring { position:absolute; border-radius:50%; border:1.5px solid rgba(109,40,217,.3); animation:spin linear infinite; }
.ring1{width:210px;height:210px;animation-duration:14s}
.ring2{width:150px;height:150px;animation-duration:9s;animation-direction:reverse;border-color:rgba(168,85,247,.22)}
.deco-cube { width:84px; height:84px; background:linear-gradient(135deg,#1e1f24,#2a2b30); border-radius:20px; border:1px solid rgba(109,40,217,.4); display:flex; align-items:center; justify-content:center; animation:glow-pulse 3s ease-in-out infinite; }
.auth-root.light .deco-cube { background:linear-gradient(135deg,#e8eaed,#f1f3f4); border-color:rgba(109,40,217,.25); }
@keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(109,40,217,.2)}50%{box-shadow:0 0 40px rgba(109,40,217,.45)}}
.deco-logo { width:56px; height:56px; object-fit:contain; border-radius:12px; }

@media(max-width:860px){.auth-right{display:none}.auth-left{width:100%;min-width:unset}.auth-form-wrap{max-width:100%}}
@media(max-width:480px){.auth-left{padding:1.5rem 1.25rem}}
</style>
