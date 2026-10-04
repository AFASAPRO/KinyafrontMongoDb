<template>
  <div class="al-screen">
    <!-- Soft flat decoration (solid color blobs only — no gradients) -->
    <div class="al-decor" aria-hidden="true">
      <span class="al-blob al-blob-a"></span>
      <span class="al-blob al-blob-b"></span>
    </div>

    <div class="al-card">
      <div class="al-brand">
        <div class="al-mark">
          <img src="/logo.png" alt="" class="al-mark-img" />
          <span class="al-mark-badge"><i class="fas fa-shield-halved"></i></span>
        </div>
        <h1 class="al-title">Admin Portal</h1>
        <p class="al-subtitle">Sign in to the KinyaBot management console</p>
      </div>

      <form class="al-form" @submit.prevent="handleLogin" novalidate>
        <label class="al-field" :class="{ 'has-error': loginErrors.email }">
          <span class="al-field-label">Email address</span>
          <span class="al-field-box">
            <i class="fas fa-envelope al-field-icon"></i>
            <input
              v-model.trim="loginForm.email"
              type="email"
              class="al-input"
              placeholder="you@kinyabot.ai"
              autocomplete="email"
              autocapitalize="off"
              @keyup.enter="focusPassword"
            />
          </span>
          <span v-if="loginErrors.email" class="al-field-error">
            <i class="fas fa-circle-exclamation"></i>{{ loginErrors.email }}
          </span>
        </label>

        <label class="al-field" :class="{ 'has-error': loginErrors.password }">
          <span class="al-field-label">Password</span>
          <span class="al-field-box">
            <i class="fas fa-lock al-field-icon"></i>
            <input
              ref="passwordInput"
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="al-input"
              placeholder="••••••••"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
            <button type="button" class="al-field-toggle" tabindex="-1" @click="showPassword = !showPassword">
              <i :class="showPassword ? 'far fa-eye-slash' : 'far fa-eye'"></i>
            </button>
          </span>
          <span v-if="loginErrors.password" class="al-field-error">
            <i class="fas fa-circle-exclamation"></i>{{ loginErrors.password }}
          </span>
        </label>

        <p v-if="loginError" class="al-alert">
          <i class="fas fa-triangle-exclamation"></i>{{ loginError }}
        </p>

        <button type="submit" class="al-btn al-btn-primary" :disabled="loginLoading">
          <i v-if="loginLoading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-right-to-bracket"></i>
          {{ loginLoading ? 'Signing in…' : 'Sign In to Dashboard' }}
        </button>

        <button type="button" class="al-btn al-btn-ghost" @click="handleInstallApp">
          <i class="fas fa-download"></i>
          Install Admin App
        </button>
      </form>

      <p class="al-hint">
        <i class="fas fa-shield-halved"></i>
        Installing opens the KinyaBot Admin app straight to this sign-in page.
      </p>

      <router-link to="/" class="al-back">
        <i class="fas fa-arrow-left"></i>
        Back to KinyaBot
      </router-link>
    </div>

    <!-- Install instructions modal (iOS / unsupported browsers) -->
    <transition name="al-fade">
      <div v-if="installModal" class="al-modal-overlay" @click.self="installModal = false">
        <div class="al-modal" role="dialog" aria-modal="true">
          <button class="al-modal-close" @click="installModal = false" aria-label="Close">
            <i class="fas fa-xmark"></i>
          </button>
          <img src="/admin-icon-192.png" alt="KinyaBot Admin" class="al-modal-icon" />
          <h3>{{ installDone ? 'Admin App Installed' : 'Install KinyaBot Admin' }}</h3>

          <p v-if="installDone" class="al-modal-lead">
            KinyaBot Admin was added to your device. Open it from your home screen —
            it starts right here on the sign-in page.
          </p>
          <template v-else>
            <p v-if="isIOS" class="al-modal-lead">Add KinyaBot Admin to your iPhone / iPad home screen:</p>
            <p v-else class="al-modal-lead">Your browser doesn't support one-tap install. Add it from the browser menu:</p>
            <ol class="al-modal-steps">
              <li><i class="fas fa-up-right-from-square"></i> Tap <strong>Share</strong> (iOS) or open the <strong>⋮ menu</strong> (Android)</li>
              <li><i class="fas fa-square-plus"></i> Choose <strong>Add to Home Screen</strong> / <strong>Install app</strong></li>
              <li><i class="fas fa-check"></i> Confirm — the Admin app appears on your home screen</li>
            </ol>
          </template>

          <button class="al-btn al-btn-primary" @click="installModal = false">Got it</button>
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

/* ── Admin PWA install ─────────────────────────────────────────── */
const { canInstall, installed, isIOS, promptInstall } = usePwaInstall()
const installModal = ref(false)
const installDone = ref(false)

async function handleInstallApp() {
  if (installed.value) { installDone.value = true; installModal.value = true; return }
  if (canInstall.value) {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      installDone.value = true
      installModal.value = true
    } else if (outcome === 'error' || outcome === 'unavailable') {
      installDone.value = false
      installModal.value = true
    }
    return
  }
  installDone.value = false
  installModal.value = true
}

/* ── Login ─────────────────────────────────────────────────────── */
const loginForm = reactive({ email: '', password: '' })
const loginErrors = reactive({ email: '', password: '' })
const loginLoading = ref(false)
const loginError = ref('')
const showPassword = ref(false)
const passwordInput = ref(null)

function focusPassword() { passwordInput.value?.focus() }

function validateLogin() {
  loginErrors.email = ''
  loginErrors.password = ''
  let ok = true
  if (!loginForm.email) { loginErrors.email = 'Email is required'; ok = false }
  if (!loginForm.password) { loginErrors.password = 'Password is required'; ok = false }
  return ok
}

async function handleLogin() {
  if (!validateLogin()) return
  loginError.value = ''
  loginLoading.value = true
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
</script>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────── */
.al-screen {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  background: #0a0a12;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  padding-top: max(1.5rem, env(safe-area-inset-top));
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Decoration: flat solid shapes only, no gradients ─────────── */
.al-decor { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.al-blob { position: absolute; border-radius: 50%; background: rgba(99, 102, 241, .10); filter: blur(90px); }
.al-blob-a { width: 480px; height: 480px; top: -140px; left: -120px; }
.al-blob-b { width: 380px; height: 380px; background: rgba(6, 182, 212, .08); bottom: -120px; right: -100px; }

/* ── Card ──────────────────────────────────────────────────────── */
.al-card {
  position: relative; z-index: 1;
  width: min(420px, 100%);
  background: #101018;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 20px;
  padding: 2.25rem 1.9rem 1.75rem;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .5);
}

/* ── Brand header ──────────────────────────────────────────────── */
.al-brand { text-align: center; margin-bottom: 1.6rem; }
.al-mark { position: relative; display: inline-block; margin-bottom: .85rem; }
.al-mark-img {
  width: 60px; height: 60px; border-radius: 16px; object-fit: contain;
  background: #16161f;
  border: 1px solid rgba(255, 255, 255, .08);
}
.al-mark-badge {
  position: absolute; bottom: -4px; right: -4px;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--brand-strong);
  border: 2.5px solid #101018;
  display: flex; align-items: center; justify-content: center;
  font-size: 9.5px; color: #fff;
}
.al-title { font-size: 1.3rem; font-weight: 700; color: #fff; letter-spacing: -.3px; margin-bottom: 3px; }
.al-subtitle { font-size: 12.5px; color: #6b7280; }

/* ── Form ──────────────────────────────────────────────────────── */
.al-form { display: flex; flex-direction: column; gap: .95rem; }
.al-field { display: flex; flex-direction: column; gap: 6px; }
.al-field-label { font-size: 11.5px; font-weight: 600; color: #8b8fa3; text-transform: uppercase; letter-spacing: .04em; }
.al-field-box {
  display: flex; align-items: center; gap: 10px;
  background: #16161f;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 11px;
  padding: 0 13px;
  transition: border-color .18s ease, background .18s ease;
}
.al-field-box:focus-within {
  border-color: rgba(99, 102, 241, .55);
  background: #17171f;
}
.al-field.has-error .al-field-box { border-color: rgba(242, 139, 130, .5); }
.al-field-icon { font-size: 13px; color: #565a6e; flex-shrink: 0; }
.al-field-box:focus-within .al-field-icon { color: #818cf8; }
.al-input {
  flex: 1; min-width: 0; padding: 12px 0;
  background: none; border: none; outline: none;
  color: #e5e7eb; font-size: 13.5px; font-family: inherit;
}
.al-input::placeholder { color: #4b5065; }
.al-field-toggle {
  background: none; border: none; color: #565a6e; cursor: pointer;
  font-size: 14px; padding: 6px; flex-shrink: 0; transition: color .15s;
}
.al-field-toggle:hover { color: #c7c9d9; }
.al-field-error {
  display: flex; align-items: center; gap: 5px;
  font-size: 11.5px; color: #f28b82;
}

.al-alert {
  display: flex; align-items: center; gap: 8px;
  background: rgba(242, 139, 130, .08);
  border: 1px solid rgba(242, 139, 130, .25);
  color: #f28b82; font-size: 12.5px;
  padding: 9px 12px; border-radius: 9px;
}

/* ── Buttons ───────────────────────────────────────────────────── */
.al-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12.5px; border-radius: 11px;
  font-size: 13.5px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: filter .15s ease, transform .1s ease, background .15s ease;
  border: none;
}
.al-btn-primary { background: var(--brand-strong); color: #fff; }
.al-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.al-btn-primary:active:not(:disabled) { transform: translateY(1px); }
.al-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.al-btn-ghost {
  background: rgba(99, 102, 241, .08);
  border: 1px solid rgba(99, 102, 241, .3);
  color: #a5b4fc;
}
.al-btn-ghost:hover { background: rgba(99, 102, 241, .16); }

.al-hint {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  margin-top: 12px; font-size: 11.5px; color: #565a6e; text-align: center; line-height: 1.5;
}
.al-hint i { color: #6366f1; flex-shrink: 0; }

.al-back {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  margin-top: 1.4rem; font-size: 13px; color: #565a6e; text-decoration: none;
  transition: color .15s;
}
.al-back:hover { color: #a5b4fc; }

/* ── Install modal ─────────────────────────────────────────────── */
.al-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, .68);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.al-modal {
  position: relative; width: min(400px, 100%);
  background: #101018;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 18px;
  padding: 26px 22px 20px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .55);
  max-height: 86dvh; overflow-y: auto;
}
.al-modal-close {
  position: absolute; top: 12px; right: 12px;
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255, 255, 255, .06); border: none;
  color: #9ca3af; font-size: 13px; cursor: pointer;
}
.al-modal-close:hover { background: rgba(255, 255, 255, .12); color: #fff; }
.al-modal-icon { width: 60px; height: 60px; border-radius: 14px; margin-bottom: 10px; }
.al-modal h3 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.al-modal-lead { font-size: 12.5px; color: #9ca3af; line-height: 1.6; margin-bottom: 14px; }
.al-modal-steps {
  list-style: none; text-align: left; display: flex; flex-direction: column; gap: 9px;
  margin-bottom: 16px;
}
.al-modal-steps li {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255, 255, 255, .03);
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 10px; padding: 10px 12px;
  font-size: 12.5px; color: #d1d5db; line-height: 1.4;
}
.al-modal-steps li i { color: #818cf8; font-size: 13px; width: 16px; text-align: center; flex-shrink: 0; }

.al-fade-enter-active, .al-fade-leave-active { transition: opacity .2s ease; }
.al-fade-enter-from, .al-fade-leave-to { opacity: 0; }

@media (max-width: 420px) {
  .al-card { padding: 1.9rem 1.35rem 1.5rem; border-radius: 16px; }
  .al-title { font-size: 1.15rem; }
}
</style>
