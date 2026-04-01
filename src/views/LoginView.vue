<template>
  <div class="auth-root" :class="{ light: isLight }">
    <!-- ── Left: Login Form ────────────────────────────────── -->
    <div class="auth-left">
      <div class="auth-logo">
        <img src="/logo.png" alt="KinyaBot" class="logo-img" />
        <span class="logo-text">KinyaBot</span>
      </div>

      <div class="auth-form-wrap">
        <!-- Forgot-password inline flow -->
        <div v-if="showForgot">
          <div class="back-link" @click="showForgot = false">
            <i class="fas fa-arrow-left"></i> Back to login
          </div>
          <h1 class="auth-heading">Reset password</h1>
          <p class="auth-sub">Enter your email and we&apos;ll send you a reset link.</p>
          <div class="field">
            <label class="field-label">Email address</label>
            <input v-model="forgotEmail" type="email" class="field-input" placeholder="your@email.com" @keyup.enter="handleForgot" />
          </div>
          <div v-if="forgotMsg" class="notice" :class="forgotMsg.type">
            <i :class="forgotMsg.type === 'ok' ? 'fas fa-check-circle' : 'fas fa-circle-exclamation'"></i>
            {{ forgotMsg.text }}
          </div>
          <button class="submit-btn" :disabled="forgotLoading" @click="handleForgot">
            <i v-if="forgotLoading" class="fas fa-spinner fa-spin"></i>
            {{ forgotLoading ? 'Sending…' : 'Send Reset Link' }}
          </button>
        </div>

        <!-- Main login form -->
        <form v-else @submit.prevent="handleLogin" novalidate>
          <h1 class="auth-heading">Welcome back</h1>
          <p class="auth-sub">Log in to KinyaBot to continue your AI journey.</p>

          <div class="social-btns">
            <button type="button" class="social-btn" @click="showOAuth('Google')">
              <i class="fab fa-google"></i><span>Continue with Google</span>
            </button>
            <button type="button" class="social-btn" @click="showOAuth('Apple')">
              <i class="fab fa-apple"></i><span>Continue with Apple</span>
            </button>
          </div>

          <transition name="fade">
            <div v-if="oauthToast" class="oauth-toast">
              <i class="fas fa-circle-info"></i>
              <span>{{ oauthToast }} OAuth is coming soon! Use email login for now.</span>
            </div>
          </transition>

          <div class="divider"><span>OR</span></div>

          <div class="field">
            <label class="field-label">Email</label>
            <input v-model="form.email" type="email" class="field-input" :class="{ error: errors.email }" placeholder="your@email.com" autocomplete="email" />
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          </div>

          <div class="field">
            <div class="field-header">
              <label class="field-label">Password</label>
              <span class="forgot-link" @click="$router.push('/forgot-password')">Forgot password?</span>
            </div>
            <div class="pass-wrap">
              <input v-model="form.password" :type="showPass ? 'text' : 'password'" class="field-input" :class="{ error: errors.password }" placeholder="••••••••" autocomplete="current-password" />
              <button type="button" class="eye-btn" @click="showPass = !showPass">
                <i :class="showPass ? 'far fa-eye-slash' : 'far fa-eye'"></i>
              </button>
            </div>
            <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          </div>

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
          Don&apos;t have an account? <router-link to="/register">Create one</router-link>
        </p>
      </div>
    </div>

    <!-- ── Right: Marketing Panel ─────────────────────────── -->
    <div class="auth-right">
      <!-- Noise / dot-grid texture -->
      <div class="ar-grid"></div>
      <!-- Ambient glow orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>

      <div class="ar-inner">
        <!-- Badge -->
        <div class="ar-badge">
          <span class="badge-dot"></span>
          <span>AI-powered · Kinyarwanda &amp; English</span>
        </div>

        <!-- Headline -->
        <h2 class="ar-headline">
          Your AI,<br />
          <span class="g-text">Always Ready.</span>
        </h2>
        <p class="ar-desc">
          Answer anything, write code, translate, summarize — in Kinyarwanda
          and beyond. Powered by cutting-edge large language models.
        </p>

        <!-- Floating chat mockup card -->
        <div class="chat-card">
          <div class="cc-header">
            <div class="cc-avatar">
              <img src="/logo.png" alt="KinyaBot" class="cc-av-img" />
            </div>
            <div>
              <div class="cc-name">KinyaBot</div>
              <div class="cc-status"><span class="cc-dot"></span>Online</div>
            </div>
          </div>
          <div class="cc-body">
            <div class="cc-bubble user-bubble">Muraho! Nshaka gufasha iki?</div>
            <div class="cc-bubble bot-bubble">
              <span class="bot-typing-text">Muraho! Ndi hano kugufasha mu Kinyarwanda n&apos;Icyongereza. Baza ikibazo cyose…</span>
            </div>
            <div class="cc-bubble user-bubble">Explain quantum computing simply.</div>
            <div class="cc-bubble bot-bubble">Quantum computing uses qubits that can be 0 and 1 simultaneously, enabling parallel computation beyond classical limits.</div>
          </div>
          <div class="cc-input-row">
            <div class="cc-fake-input">Ask anything…</div>
            <div class="cc-send-btn"><i class="fas fa-paper-plane"></i></div>
          </div>
        </div>

        <!-- Feature pills -->
        <div class="feature-pills">
          <div class="pill"><i class="fas fa-language"></i> Kinyarwanda</div>
          <div class="pill"><i class="fas fa-code"></i> Code Gen</div>
          <div class="pill"><i class="fas fa-image"></i> Image AI</div>
          <div class="pill"><i class="fas fa-bolt"></i> Fast</div>
        </div>

        <!-- Stats row -->
        <div class="ar-stats">
          <div class="ar-stat">
            <span class="ar-stat-num">10K+</span>
            <span class="ar-stat-lbl">Users</span>
          </div>
          <div class="ar-stat-sep"></div>
          <div class="ar-stat">
            <span class="ar-stat-num">1M+</span>
            <span class="ar-stat-lbl">Messages</span>
          </div>
          <div class="ar-stat-sep"></div>
          <div class="ar-stat">
            <span class="ar-stat-num">99.9%</span>
            <span class="ar-stat-lbl">Uptime</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
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

const isLight = computed(() => document.documentElement.classList.contains('light-mode'))

async function showOAuth(provider) {
  if (provider === 'Google') {
    serverError.value = ''
    loading.value = true
    try {
      const result = await auth.loginWithGoogle()
      if (!result.user.onboarded) router.push('/onboarding')
      else router.push('/chat')
    } catch (err) {
      serverError.value = err.response?.data?.error || 'Google login failed. Please try again.'
    } finally {
      loading.value = false
    }
  } else {
    oauthToast.value = provider
    setTimeout(() => { oauthToast.value = '' }, 3500)
  }
}

function validate() {
  errors.email = ''
  errors.password = ''
  let ok = true
  if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) { errors.email = 'Enter a valid email'; ok = false }
  if (!form.password || form.password.length < 6) { errors.password = 'At least 6 characters'; ok = false }
  return ok
}

async function handleLogin() {
  if (!validate()) return
  serverError.value = ''
  loading.value = true
  try {
    const result = await auth.login(form.email, form.password, rememberMe.value)
    if (!result.user.onboarded) router.push('/onboarding')
    else router.push('/chat')
  } catch (err) {
    serverError.value = err.response?.data?.error || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleForgot() {
  if (!forgotEmail.value) return
  forgotLoading.value = true
  forgotMsg.value = null
  try {
    await auth.forgotPassword(forgotEmail.value)
    forgotMsg.value = { type: 'ok', text: 'If that email exists, a reset link has been sent. Check your inbox.' }
  } catch {
    forgotMsg.value = { type: 'err', text: 'Something went wrong. Please try again.' }
  } finally {
    forgotLoading.value = false
  }
}
</script>

<style scoped>
/* ─── Root layout ──────────────────────────────────────────── */
.auth-root {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0a0a0c;
}
.auth-root.light { background: #f0f2f5; }

/* ─── Left panel ───────────────────────────────────────────── */
.auth-left {
  width: 460px;
  min-width: 460px;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  background: #0f0f11;
  overflow-y: auto;
  border-right: 1px solid rgba(255,255,255,0.06);
  position: relative;
  z-index: 1;
}
.auth-root.light .auth-left {
  background: #ffffff;
  border-right-color: rgba(0,0,0,0.08);
  box-shadow: 4px 0 32px rgba(0,0,0,0.06);
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2.5rem;
}
.logo-img {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
}
.logo-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}
.auth-root.light .logo-text { color: #1a1a2e; }

.auth-form-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 360px;
}
.auth-heading {
  font-size: 1.65rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 5px;
  letter-spacing: -0.025em;
  line-height: 1.2;
}
.auth-root.light .auth-heading { color: #1a1a2e; }

.auth-sub {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 1.6rem;
  line-height: 1.6;
}
.auth-root.light .auth-sub { color: #5f6368; }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #8ab4f8;
  cursor: pointer;
  margin-bottom: 1.25rem;
  font-weight: 500;
}
.back-link:hover { text-decoration: underline; }

/* Social buttons */
.social-btns { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1rem; }
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  color: #d1d5db;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s;
}
.auth-root.light .social-btn {
  background: #f8f9fa;
  border-color: #e0e0e0;
  color: #202124;
}
.social-btn:hover {
  background: #1f1f23;
  border-color: rgba(255,255,255,0.15);
  color: #fff;
}
.auth-root.light .social-btn:hover { background: #e8eaed; }
.fa-google { color: #ea4335; }
.fa-apple { color: #fff; }
.auth-root.light .fa-apple { color: #000; }

.oauth-toast {
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.25);
  color: #c4b5fd;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 0.9rem;
}
.auth-root.light .oauth-toast { background: rgba(99,102,241,.08); color: #6d28d9; }

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4b5563;
  font-size: 12px;
  margin-bottom: 1.1rem;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.08);
}
.auth-root.light .divider { color: #9aa0a6; }
.auth-root.light .divider::before,
.auth-root.light .divider::after { background: #e0e0e0; }

/* Fields */
.field { margin-bottom: 0.9rem; }
.field-label {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.auth-root.light .field-label { color: #5f6368; }

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}
.forgot-link {
  font-size: 12.5px;
  color: #8ab4f8;
  cursor: pointer;
  font-weight: 500;
}
.forgot-link:hover { text-decoration: underline; }
.auth-root.light .forgot-link { color: #1a73e8; }

.field-input {
  width: 100%;
  padding: 10px 14px;
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  color: #f9fafb;
  font-size: 13.5px;
  transition: border-color 0.18s, box-shadow 0.18s;
  outline: none;
}
.auth-root.light .field-input {
  background: #f8f9fa;
  border-color: #dadce0;
  color: #202124;
}
.field-input::placeholder { color: #4b5563; }
.auth-root.light .field-input::placeholder { color: #9aa0a6; }
.field-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124,58,237,0.18);
}
.field-input.error { border-color: #f28b82; }
.field-error { font-size: 11.5px; color: #f28b82; margin-top: 3px; display: block; }

.pass-wrap { position: relative; }
.pass-wrap .field-input { padding-right: 42px; }
.eye-btn {
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  font-size: 14px;
  padding: 4px;
  cursor: pointer;
  transition: color 0.18s;
}
.eye-btn:hover { color: #d1d5db; }

.remember-row { margin-bottom: 1rem; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  user-select: none;
}
.auth-root.light .checkbox-label { color: #5f6368; }
.checkbox-label input[type=checkbox] { display: none; }
.checkmark {
  width: 16px;
  height: 16px;
  border: 1.5px solid rgba(255,255,255,0.15);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
  flex-shrink: 0;
}
.auth-root.light .checkmark { border-color: #dadce0; }
.checkbox-label input:checked + .checkmark {
  background: #7c3aed;
  border-color: #7c3aed;
}
.checkbox-label input:checked + .checkmark::after {
  content: '✓';
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.notice {
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 0.9rem;
  line-height: 1.5;
}
.notice.ok {
  background: rgba(52,168,83,0.1);
  border: 1px solid rgba(52,168,83,0.3);
  color: #34a853;
}
.notice.err, .error-notice {
  background: rgba(242,139,130,0.1);
  border: 1px solid rgba(242,139,130,0.25);
  color: #f28b82;
}

.submit-btn {
  width: 100%;
  padding: 11px;
  background: #7c3aed;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 1.1rem;
  letter-spacing: -0.01em;
}
.submit-btn:not(:disabled):hover {
  background: #6d28d9;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124,58,237,0.35);
}
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.switch-text { font-size: 13px; color: #6b7280; text-align: center; }
.auth-root.light .switch-text { color: #5f6368; }
.switch-text a { color: #8ab4f8; font-weight: 500; }
.auth-root.light .switch-text a { color: #1a73e8; }
.switch-text a:hover { text-decoration: underline; }

/* ─── Right panel ──────────────────────────────────────────── */
.auth-right {
  flex: 1;
  background: #060608;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.auth-root.light .auth-right { background: #0f0f11; }

/* dot-grid background */
.ar-grid {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(124,58,237,0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

/* glow orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: rgba(124,58,237,0.13);
  top: -120px;
  right: -100px;
}
.orb-2 {
  width: 360px;
  height: 360px;
  background: rgba(168,85,247,0.09);
  bottom: -80px;
  left: -60px;
}

.ar-inner {
  position: relative;
  z-index: 2;
  max-width: 420px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

/* badge */
.ar-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(124,58,237,0.12);
  border: 1px solid rgba(124,58,237,0.28);
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 100px;
  width: fit-content;
  letter-spacing: 0.01em;
}
.badge-dot {
  width: 6px;
  height: 6px;
  background: #a78bfa;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

/* headline */
.ar-headline {
  font-size: clamp(2rem, 3.2vw, 2.8rem);
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  letter-spacing: -0.035em;
}

.ar-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.7;
  max-width: 380px;
}

/* Chat card mockup */
.chat-card {
  background: #111115;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1);
}
.cc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}
.cc-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: #1a1a2e;
  border: 1px solid rgba(124,58,237,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.cc-av-img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.cc-name { font-size: 13px; font-weight: 600; color: #f9fafb; }
.cc-status { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #6b7280; }
.cc-dot {
  width: 6px;
  height: 6px;
  background: #34a853;
  border-radius: 50%;
}

.cc-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cc-bubble {
  padding: 9px 13px;
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.55;
  max-width: 90%;
}
.user-bubble {
  background: rgba(124,58,237,0.18);
  border: 1px solid rgba(124,58,237,0.25);
  color: #ddd6fe;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
.bot-bubble {
  background: #1a1a1f;
  border: 1px solid rgba(255,255,255,0.07);
  color: #d1d5db;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.cc-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.cc-fake-input {
  flex: 1;
  font-size: 12.5px;
  color: #4b5563;
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  padding: 7px 12px;
}
.cc-send-btn {
  width: 30px;
  height: 30px;
  background: #7c3aed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  flex-shrink: 0;
}

/* Feature pills */
.feature-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  color: #9ca3af;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 100px;
  transition: all 0.18s;
}
.pill i { color: #a78bfa; font-size: 11px; }
.pill:hover {
  background: rgba(124,58,237,0.1);
  border-color: rgba(124,58,237,0.3);
  color: #e5e7eb;
}

/* Stats */
.ar-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-top: 0.4rem;
}
.ar-stat { display: flex; flex-direction: column; gap: 2px; }
.ar-stat-num {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
}
.ar-stat-lbl { font-size: 11.5px; color: #6b7280; font-weight: 500; }
.ar-stat-sep {
  width: 1px;
  height: 32px;
  background: rgba(255,255,255,0.08);
}

/* ─── Responsive ───────────────────────────────────────────── */
@media (max-width: 860px) {
  .auth-right { display: none; }
  .auth-left { width: 100%; min-width: unset; }
  .auth-form-wrap { max-width: 100%; }
}
@media (max-width: 480px) {
  .auth-left { padding: 1.5rem 1.25rem; }
  .auth-heading { font-size: 1.4rem; }
}
</style>
