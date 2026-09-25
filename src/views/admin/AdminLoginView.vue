<template>
  <div class="admin-auth">
    <!-- Animated background -->
    <div class="ab-bg">
      <div class="ab-orb ab-orb1"></div>
      <div class="ab-orb ab-orb2"></div>
      <div class="ab-orb ab-orb3"></div>
      <div class="ab-grid"></div>
      <!-- Floating particles -->
      <div v-for="i in 10" :key="i" class="ab-particle" :style="particleStyle(i)"></div>
    </div>

    <div class="ab-card">
      <!-- ── Header ── -->
      <div class="ab-header">
        <div class="ab-logo-wrap">
          <img src="/logo.png" alt="KinyaBot" class="ab-logo" />
          <div class="ab-shield"><i class="fas fa-shield-halved"></i></div>
        </div>
        <h1 class="ab-title">Admin Portal</h1>
        <p class="ab-sub">KinyaBot AI — Management Console</p>
      </div>

      <!-- ── Login Form ── -->
      <div class="ab-form">
        <div class="ab-field" :class="{ focused: focus.email, hasVal: loginForm.email }">
          <div class="ab-field-icon"><i class="fas fa-envelope"></i></div>
          <input
            v-model="loginForm.email"
            type="email"
            placeholder="Admin email"
            class="ab-input"
            autocomplete="email"
            @focus="focus.email = true"
            @blur="focus.email = false"
            @keyup.enter="$refs.loginPassRef?.focus()"
          />
        </div>
        <span v-if="loginErrors.email" class="ab-err">
          <i class="fas fa-circle-exclamation"></i> {{ loginErrors.email }}
        </span>

        <div class="ab-field" :class="{ focused: focus.password, hasVal: loginForm.password }">
          <div class="ab-field-icon"><i class="fas fa-lock"></i></div>
          <input
            ref="loginPassRef"
            v-model="loginForm.password"
            :type="showLoginPass ? 'text' : 'password'"
            placeholder="Password"
            class="ab-input"
            autocomplete="current-password"
            @focus="focus.password = true"
            @blur="focus.password = false"
            @keyup.enter="handleLogin"
          />
          <button type="button" class="ab-eye" @click="showLoginPass = !showLoginPass">
            <i :class="showLoginPass ? 'far fa-eye-slash' : 'far fa-eye'"></i>
          </button>
        </div>
        <span v-if="loginErrors.password" class="ab-err">
          <i class="fas fa-circle-exclamation"></i> {{ loginErrors.password }}
        </span>

        <div v-if="loginError" class="ab-server-err">
          <i class="fas fa-circle-exclamation"></i> {{ loginError }}
        </div>

        <button class="ab-btn" :disabled="loginLoading" @click="handleLogin">
          <span v-if="loginLoading" class="ab-btn-inner">
            <i class="fas fa-spinner fa-spin"></i> Authenticating…
          </span>
          <span v-else class="ab-btn-inner">
            <i class="fas fa-right-to-bracket"></i> Sign In to Dashboard
          </span>
        </button>

        <!-- ── PWA: Install the Admin app ── -->
        <button class="ab-btn ab-btn-ghost" type="button" @click="handleInstallApp">
          <span class="ab-btn-inner">
            <i class="fas fa-download"></i> Download App
          </span>
        </button>
        <p class="ab-install-note">
          <i class="fas fa-shield-halved"></i>
          Install KinyaBot Admin on your phone — opens directly on this login page.
        </p>

        <div class="ab-hint">
          <i class="fas fa-circle-info"></i>
          <span>New admin accounts are created from the dashboard by a super admin — there's no self-registration here.</span>
        </div>
      </div>

      <router-link to="/" class="ab-back">
        <i class="fas fa-arrow-left"></i> Back to KinyaBot
      </router-link>
    </div>

    <!-- ── Install instructions modal (iOS / unsupported browsers) ── -->
    <transition name="fade">
      <div v-if="installModal" class="ab-modal-overlay" @click.self="installModal=false">
        <div class="ab-modal" role="dialog" aria-modal="true">
          <button class="ab-modal-close" @click="installModal=false" aria-label="Close"><i class="fas fa-xmark"></i></button>
          <img src="/admin-icon-192.png" alt="KinyaBot Admin" class="ab-modal-icon" />
          <h3>{{ installDone ? 'Admin App Installed' : 'Install KinyaBot Admin' }}</h3>
          <p v-if="installDone" class="ab-modal-lead">
            KinyaBot Admin was added to your device. Open it from your home screen —
            it starts right here on the Admin login.
          </p>
          <template v-else>
            <p v-if="isIOS" class="ab-modal-lead">Add KinyaBot Admin to your iPhone / iPad home screen:</p>
            <p v-else class="ab-modal-lead">Your browser doesn't support one-tap install. Add it from the browser menu:</p>
            <ol class="ab-modal-steps">
              <li><i class="fas fa-up-right-from-square"></i> Tap the <strong>Share</strong> button (iOS) or open the <strong>⋮ menu</strong> (Android)</li>
              <li><i class="fas fa-square-plus"></i> Choose <strong>Add to Home Screen</strong> / <strong>Install app</strong></li>
              <li><i class="fas fa-check"></i> Confirm — the Admin app appears on your home screen</li>
            </ol>
          </template>
          <button class="ab-btn" @click="installModal=false">Got it</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { usePwaInstall } from '../../composables/usePwaInstall'

const router = useRouter()
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Admin PWA install ────────────────────────────────────────
const { canInstall, installed, isIOS, promptInstall } = usePwaInstall()
const installModal = ref(false)   // manual instructions (iOS / unsupported)
const installDone = ref(false)    // success note

async function handleInstallApp() {
  if (installed.value) { installDone.value = true; installModal.value = true; return }
  if (canInstall.value) {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      installDone.value = true
      installModal.value = true
    } else if (outcome === 'error' || outcome === 'unavailable') {
      // Native prompt unusable → fall back to manual instructions
      installDone.value = false
      installModal.value = true
    }
    return
  }
  // iOS Safari & browsers without the native prompt → clear instructions
  installDone.value = false
  installModal.value = true
}

// ── Focus state ──────────────────────────────────────────────
const focus = reactive({ email: false, password: false })

// ── Login ────────────────────────────────────────────────────
const loginForm    = reactive({ email: '', password: '' })
const loginErrors  = reactive({ email: '', password: '' })
const loginLoading = ref(false)
const loginError   = ref('')
const showLoginPass = ref(false)
const loginPassRef  = ref(null)

function validateLogin() {
  loginErrors.email = ''; loginErrors.password = ''
  let ok = true
  if (!loginForm.email)    { loginErrors.email    = 'Email is required'; ok = false }
  if (!loginForm.password) { loginErrors.password = 'Password is required'; ok = false }
  return ok
}

async function handleLogin() {
  if (!validateLogin()) return
  loginError.value = ''; loginLoading.value = true
  try {
    const { data } = await axios.post(`${API}/admin/login`, {
      email: loginForm.email,
      password: loginForm.password
    })
    localStorage.setItem('kb_admin_token', data.token)
    localStorage.setItem('kb_admin', JSON.stringify(data.admin))
    router.push('/admin/dashboard')
  } catch (err) {
    loginError.value = err.response?.data?.error || 'Login failed. Please check your credentials.'
  } finally {
    loginLoading.value = false
  }
}

function particleStyle(i) {
  return {
    left:              (5 + i * 9.5) + '%',
    top:               (8 + (i * 13) % 84) + '%',
    width:             (3 + i % 4) + 'px',
    height:            (3 + i % 4) + 'px',
    animationDelay:    (i * 0.45) + 's',
    animationDuration: (4 + i % 3) + 's'
  }
}
</script>

<style scoped>
/* ── Root ───────────────────────────────────────────────── */
.admin-auth {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  overflow-y: auto;
  background: #05050d;
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem 1rem;
  padding-top: max(1.5rem, env(safe-area-inset-top));
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
  position: relative;
}

/* ── Background ─────────────────────────────────────────────── */
.ab-bg { position: absolute; inset: 0; pointer-events: none; }
.ab-orb { position: absolute; border-radius: 50%; filter: blur(100px); }
.ab-orb1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(79,70,229,.18), transparent); top: -150px; left: -150px; }
.ab-orb2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(14,165,233,.14), transparent); bottom: -100px; right: -100px; }
.ab-orb3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(168,85,247,.12), transparent); top: 40%; left: 50%; transform: translate(-50%,-50%); }
.ab-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(99,102,241,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,.035) 1px, transparent 1px);
  background-size: 48px 48px;
}
.ab-particle {
  position: absolute; border-radius: 50%;
  background: rgba(99,102,241,.35);
  animation: float ease-in-out infinite alternate;
}
@keyframes float {
  from { transform: translateY(0) scale(1); opacity: .35; }
  to   { transform: translateY(-22px) scale(1.4); opacity: .08; }
}

/* ── Card ───────────────────────────────────────────────────── */
.ab-card {
  background: rgba(10,10,20,.92);
  border: 1px solid rgba(99,102,241,.22);
  border-radius: 24px;
  padding: 2.25rem 2rem 1.75rem;
  width: min(440px, 100%);
  margin: auto;
  position: relative; z-index: 2;
  box-shadow:
    0 0 0 1px rgba(99,102,241,.08),
    0 0 60px rgba(79,70,229,.12),
    0 32px 64px rgba(0,0,0,.65);
  animation: fadeUp .45s cubic-bezier(.34,1.56,.64,1);
  backdrop-filter: blur(20px);
}

/* ── Header ─────────────────────────────────────────────────── */
.ab-header { text-align: center; margin-bottom: 1.75rem; }
.ab-logo-wrap { position: relative; display: inline-block; margin-bottom: .9rem; }
.ab-logo {
  width: 68px; height: 68px; border-radius: 18px; object-fit: contain;
  box-shadow: 0 0 0 1px rgba(99,102,241,.3), 0 0 30px rgba(79,70,229,.45);
  animation: pulse-logo 3s ease-in-out infinite;
}
@keyframes pulse-logo {
  0%, 100% { box-shadow: 0 0 0 1px rgba(99,102,241,.3), 0 0 24px rgba(79,70,229,.35); }
  50%       { box-shadow: 0 0 0 1px rgba(99,102,241,.5), 0 0 44px rgba(79,70,229,.55); }
}
.ab-shield {
  position: absolute; bottom: -5px; right: -5px;
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: #fff;
  border: 2.5px solid rgba(10,10,20,.92);
  box-shadow: 0 2px 8px rgba(79,70,229,.5);
}
.ab-title { font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 4px; letter-spacing: -.4px; }
.ab-sub   { font-size: 12.5px; color: #4b5563; }

/* ── Form ───────────────────────────────────────────────────── */
.ab-form { display: flex; flex-direction: column; gap: 3px; }

.ab-field {
  display: flex; align-items: center;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(99,102,241,.14);
  border-radius: 11px; overflow: hidden;
  transition: border-color .2s, box-shadow .2s, background .2s;
  margin-bottom: 1px;
}
.ab-field.focused {
  border-color: rgba(99,102,241,.5);
  box-shadow: 0 0 0 3px rgba(99,102,241,.1);
  background: rgba(99,102,241,.05);
}
.ab-field-icon {
  width: 44px; display: flex; align-items: center; justify-content: center;
  color: #4b5563; font-size: 14px; flex-shrink: 0;
  transition: color .2s;
}
.ab-field.focused .ab-field-icon { color: #818cf8; }

.ab-input {
  flex: 1; padding: 12px 10px 12px 0;
  background: none; border: none; outline: none;
  color: #e2e8f0; font-size: 13.5px;
  font-family: inherit;
}
.ab-input::placeholder { color: #374151; }
.ab-eye {
  background: none; border: none; color: #4b5563; padding: 10px 12px;
  font-size: 14px; cursor: pointer; transition: color .2s; flex-shrink: 0;
}
.ab-eye:hover { color: #e2e8f0; }

.ab-err {
  font-size: 11.5px; color: #f28b82;
  display: flex; align-items: center; gap: 5px;
  padding: 2px 4px 6px;
}
.ab-err i { font-size: 11px; }

.ab-server-err {
  display: flex; align-items: center; gap: 8px;
  background: rgba(242,139,130,.1); border: 1px solid rgba(242,139,130,.25);
  color: #f28b82; padding: 9px 12px; border-radius: 9px; font-size: 12.5px;
  margin: 4px 0;
}

/* ── Button ─────────────────────────────────────────────────── */
.ab-btn {
  width: 100%; padding: 13px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border: none; border-radius: 11px; color: #fff;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all .25s; margin-top: 8px;
  box-shadow: 0 4px 20px rgba(79,70,229,.35);
  font-family: inherit;
}
.ab-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(79,70,229,.5);
}
.ab-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.ab-btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }

/* Secondary (Download App) button */
.ab-btn-ghost {
  background: rgba(99, 102, 241, .08);
  border: 1px solid rgba(99, 102, 241, .4);
  color: #c7d2fe;
  box-shadow: none;
  margin-top: 10px;
}
.ab-btn-ghost:hover:not(:disabled) {
  background: rgba(99, 102, 241, .18);
  box-shadow: 0 4px 18px rgba(79, 70, 229, .25);
  transform: translateY(-1px);
}
.ab-install-note {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  margin-top: 9px;
  font-size: 11.5px; color: #4b5563; text-align: center; line-height: 1.5;
}
.ab-install-note i { color: #6366f1; font-size: 11px; flex-shrink: 0; }

/* ── Hints ──────────────────────────────────────────────────── */
.ab-hint {
  display: flex; align-items: flex-start; gap: 9px;
  background: rgba(99,102,241,.07); border: 1px solid rgba(99,102,241,.14);
  border-radius: 9px; padding: 10px 12px; margin-top: 14px;
  font-size: 12px; color: #6b7280; line-height: 1.55;
}
.ab-hint i { color: #6366f1; margin-top: 1px; flex-shrink: 0; font-size: 13px; }

/* ── Back link ──────────────────────────────────────────────── */
.ab-back {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  margin-top: 1.25rem; font-size: 13px; color: #374151;
  text-decoration: none; transition: color .2s;
}
.ab-back:hover { color: #8ab4f8; }

/* ── Transitions ────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
  .ab-input { font-size: 16px; } /* prevents iOS zoom-on-focus */
  .ab-card { padding: 1.75rem 1.25rem 1.5rem; }
  .ab-title { font-size: 1.2rem; }
}

/* ── Install instructions modal ─────────────────────────────── */
.ab-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, .7); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.ab-modal {
  position: relative; width: min(400px, 100%);
  background: #0b0b18; border: 1px solid rgba(99, 102, 241, .35);
  border-radius: 20px; padding: 28px 22px 20px; text-align: center;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .65), 0 0 60px rgba(79, 70, 229, .12);
  animation: fadeUp .3s cubic-bezier(.34, 1.56, .64, 1);
  max-height: 86dvh; overflow-y: auto;
}
.ab-modal-close {
  position: absolute; top: 12px; right: 12px; width: 32px; height: 32px;
  border-radius: 9px; background: rgba(255, 255, 255, .06); border: none;
  color: #9ca3af; font-size: 14px; cursor: pointer;
}
.ab-modal-close:hover { background: rgba(255, 255, 255, .12); color: #fff; }
.ab-modal-icon { width: 64px; height: 64px; border-radius: 15px; margin-bottom: 10px; }
.ab-modal h3 { font-size: 16.5px; font-weight: 800; color: #fff; margin-bottom: 8px; }
.ab-modal-lead { font-size: 13px; color: #9ca3af; line-height: 1.6; margin-bottom: 14px; }
.ab-modal-steps {
  list-style: none; text-align: left; counter-reset: step;
  display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;
}
.ab-modal-steps li {
  display: flex; align-items: center; gap: 11px;
  background: rgba(99, 102, 241, .06); border: 1px solid rgba(99, 102, 241, .16);
  border-radius: 11px; padding: 11px 13px;
  font-size: 13px; color: #d1d5db; line-height: 1.45;
}
.ab-modal-steps li i { color: #818cf8; font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
</style>
