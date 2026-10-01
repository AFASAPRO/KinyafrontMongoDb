<template>
  <!-- ═══ MOBILE LAYOUT (≤768px) ═══ -->
  <MobileAuthShell v-if="isMobile" title="Login" subtitle="Welcome back! Log in to continue.">
    <div v-if="sessionExpiredNotice" class="m-notice warn">
      <i class="fas fa-clock"></i><span>Your session expired. Please sign in again to continue.</span>
    </div>

    <form @submit.prevent="handleLogin" novalidate>
      <div class="m-field">
        <label class="m-label" for="m-email">Email</label>
        <div class="m-input-wrap">
          <i class="m-ic fas fa-envelope"></i>
          <input id="m-email" v-model="form.email" type="email" inputmode="email" class="m-input has-ic" :class="{error:errors.email}" placeholder="your@email.com" autocomplete="email" autocapitalize="none" />
        </div>
        <span v-if="errors.email" class="m-err">{{ errors.email }}</span>
      </div>

      <div class="m-field">
        <label class="m-label" for="m-pass">Password</label>
        <div class="m-input-wrap">
          <i class="m-ic fas fa-lock"></i>
          <input id="m-pass" v-model="form.password" :type="showPass?'text':'password'" class="m-input has-ic" :class="{error:errors.password}" placeholder="••••••••" autocomplete="current-password" />
          <button type="button" class="m-eye" @click="showPass=!showPass" :aria-label="showPass?'Hide password':'Show password'">
            <i :class="showPass?'far fa-eye-slash':'far fa-eye'"></i>
          </button>
        </div>
        <span v-if="errors.password" class="m-err">{{ errors.password }}</span>
      </div>

      <div class="m-row">
        <label class="m-check">
          <input type="checkbox" v-model="rememberMe" /><span class="box"></span><span>Remember me</span>
        </label>
        <button type="button" class="m-link" @click="$router.push('/forgot-password')">Forgot password?</button>
      </div>

      <div v-if="serverError" class="m-notice err"><i class="fas fa-circle-exclamation"></i><span>{{ serverError }}</span></div>

      <button type="submit" class="m-btn" :disabled="loading">
        <i v-if="loading" class="fas fa-spinner fa-spin"></i>
        {{ loading ? 'Logging in…' : 'Login' }}
      </button>
    </form>

    <div class="m-or"><span>Or</span></div>
    <div class="m-social">
      <button type="button" @click="showOAuth('Google')" aria-label="Continue with Google"><i class="fab fa-google"></i></button>
      <button type="button" @click="showOAuth('Apple')" aria-label="Continue with Apple"><i class="fab fa-apple"></i></button>
    </div>
    <transition name="fade">
      <div v-if="oauthToast" class="m-notice info m-toast"><i class="fas fa-circle-info"></i><span>{{ oauthToast }} sign-in is coming soon! Use email for now.</span></div>
    </transition>

    <p class="m-switch">Don't have an account?<router-link to="/register">Sign up</router-link></p>
  </MobileAuthShell>

  <!-- ═══ DESKTOP LAYOUT ═══ -->
  <DesktopAuthShell v-else>
      <div class="auth-form-wrap">
        <div class="auth-kicker"><span></span> KINYABOT ACCOUNT</div>
        <h1 class="auth-heading">Welcome back!</h1>
        <p class="auth-sub">Log in to KinyaBot to continue your AI journey.</p>

        <!-- Session expired while using the app → friendly notice, no black screen -->
        <div v-if="sessionExpiredNotice" class="notice warn-notice">
          <i class="fas fa-clock"></i> Your session expired. Please sign in again to continue.
        </div>

        <!-- Show forgot password form inline -->
        <div v-if="showForgot">
          <div class="back-link" @click="showForgot=false">
            <i class="fas fa-arrow-left"></i> Back to login
          </div>
          <h2 class="sub-heading">Reset your password</h2>
          <p class="auth-sub">Enter your email and we'll send you a reset link.</p>
          <div class="field">
            <label class="field-label" for="forgot-email">Email address</label>
            <div class="field-input-wrap">
              <i class="field-icon fas fa-envelope" aria-hidden="true"></i>
              <input id="forgot-email" v-model="forgotEmail" type="email" class="field-input" placeholder="name@example.com" autocomplete="email" @keyup.enter="handleForgot" />
            </div>
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
            <label class="field-label" for="login-email">Email address</label>
            <div class="field-input-wrap">
              <i class="field-icon fas fa-envelope" aria-hidden="true"></i>
              <input id="login-email" v-model="form.email" type="email" class="field-input" :class="{error:errors.email}" placeholder="name@example.com" autocomplete="email" />
            </div>
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          </div>

          <div class="field">
            <div class="field-header">
              <label class="field-label" for="login-password">Password</label>
              <span class="forgot-link" @click="$router.push('/forgot-password')">Forgot password?</span>
            </div>
            <div class="pass-wrap">
              <i class="field-icon fas fa-lock" aria-hidden="true"></i>
              <input id="login-password" v-model="form.password" :type="showPass?'text':'password'" class="field-input" :class="{error:errors.password}" placeholder="Enter your password" autocomplete="current-password" />
              <button type="button" class="eye-btn" @click="showPass=!showPass" :aria-label="showPass?'Hide password':'Show password'">
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
  </DesktopAuthShell>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePwaInstall } from '../composables/usePwaInstall'
import InstallHint from '../components/InstallHint.vue'
import { isLightMode, toggleThemeMode } from '../theme'
import MobileAuthShell from '../components/mobile/MobileAuthShell.vue'
import DesktopAuthShell from '../components/desktop/DesktopAuthShell.vue'
import { useIsMobile } from '../composables/useIsMobile'

const isMobile = useIsMobile()

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// Show the install action when it can do something useful:
//  • the browser already offers the native prompt (canInstall)
//  • iOS (manual Add-to-Home-Screen flow)
//  • any phone (Chrome Android may fire the event later — the button
//    gracefully falls back to instructions if the prompt isn't ready)
const { canInstall, installed, isIOS, isMobileDevice } = usePwaInstall()
const showInstall = computed(() => !installed.value && (canInstall.value || isIOS || isMobileDevice))

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

// Chat-first: after authentication the user returns to the chat
// (`/`). A redirect target is set by the guest auth gate.
const redirectTarget = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
  ? route.query.redirect : '/'

// Returned here after a session expiry while on a protected route
const sessionExpiredNotice = computed(() => route.query.expired === '1')

function afterAuth(result) {
  // Router guard sends non-onboarded accounts to /onboarding automatically
  if (!result.user.onboarded) router.push('/onboarding')
  else router.push(redirectTarget)
}

async function showOAuth(provider) {
  if (provider === 'Google') {
    serverError.value = ''; loading.value = true
    try {
      const result = await auth.loginWithGoogle()
      afterAuth(result)
    } catch (err) {
      serverError.value = err.response?.data?.error || 'Google login failed. Please try again.'
    } finally { loading.value = false }
  } else {
    oauthToast.value = provider
    setTimeout(() => { oauthToast.value = '' }, 3500)
  }
}

// Reactive theme state — shared across the whole app (see src/theme.js).
// Toggling here re-skins this screen immediately AND persists for every
// screen that follows (register, onboarding, chat, ...).
const isLight = isLightMode

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
    afterAuth(result)
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
.auth-form-wrap { width: 100%; }
.auth-kicker { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 10px; font-weight: 700; letter-spacing: .12em; margin-bottom: 15px; }
.auth-kicker span { width: 7px; height: 7px; border-radius: 50%; background: #34a853; box-shadow: 0 0 0 4px rgba(52,168,83,.13); }
.auth-heading { font-size: 2rem; line-height: 1.15; font-weight: 700; color: var(--text-1); margin-bottom: 8px; }
.sub-heading { font-size: 1.25rem; font-weight: 650; color: var(--text-1); margin-bottom: .5rem; }
.auth-sub { font-size: 14px; color: var(--text-2); margin-bottom: 1.6rem; line-height: 1.55; }
.back-link { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--accent-solid); cursor: pointer; margin-bottom: 1.25rem; font-weight: 600; }
.back-link:hover { text-decoration: underline; }
.social-btns { display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.2rem; }
.social-btn { min-height: 46px; display: flex; align-items: center; justify-content: center; gap: 11px; width: 100%; padding: 10px 16px; background: var(--bg-card); border: 1px solid var(--border-md); border-radius: 9px; color: var(--text-1); font-size: 13.5px; font-weight: 600; transition: background .18s, border-color .18s, transform .18s; }
.social-btn:hover { background: var(--bg-hover); border-color: var(--text-3); transform: translateY(-1px); }
.social-btn:focus-visible, .submit-btn:focus-visible, .eye-btn:focus-visible, .forgot-link:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent-solid) 35%, transparent); outline-offset: 2px; }
.fa-google { color: #ea4335; font-size: 16px; }
.fa-apple { font-size: 17px; }
.divider { display: flex; align-items: center; gap: 13px; color: var(--text-3); font-size: 10px; font-weight: 700; letter-spacing: .1em; margin: 0 0 1.15rem; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border-md); }
.field { margin-bottom: 1rem; }
.field-label { display: block; font-size: 12px; font-weight: 650; color: var(--text-1); margin-bottom: 7px; }
.field-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.field-header .field-label { margin-bottom: 0; }
.forgot-link { font-size: 12px; color: var(--accent-solid); cursor: pointer; font-weight: 600; }
.forgot-link:hover { text-decoration: underline; }
.field-input-wrap, .pass-wrap { position: relative; }
.field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); z-index: 1; color: var(--text-3); font-size: 14px; pointer-events: none; transition: color .18s; }
.field-input-wrap:focus-within .field-icon, .pass-wrap:focus-within .field-icon { color: var(--accent-solid); }
.field-input { width: 100%; height: 48px; padding: 0 14px 0 42px; background: var(--bg-card); border: 1px solid var(--border-md); border-radius: 9px; color: var(--text-1); font-size: 14px; transition: border-color .18s, box-shadow .18s, background .18s; outline: none; }
.field-input::placeholder { color: var(--text-3); }
.field-input:hover { border-color: var(--text-3); }
.field-input:focus { background: var(--bg-base); border-color: var(--accent-solid); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid) 16%, transparent); }
.field-input.error { border-color: var(--red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 12%, transparent); }
.field-error { font-size: 12px; color: var(--red); margin-top: 6px; display: block; }
.pass-wrap .field-input { padding-right: 46px; }
.eye-btn { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border-radius: 7px; background: transparent; color: var(--text-2); font-size: 14px; display: grid; place-items: center; transition: color .18s, background .18s; }
.eye-btn:hover { color: var(--text-1); background: var(--bg-hover); }
.remember-row { margin: .1rem 0 1.1rem; }
.checkbox-label { display: flex; align-items: center; gap: 9px; cursor: pointer; font-size: 12.5px; color: var(--text-2); user-select: none; }
.checkbox-label input[type=checkbox] { position: absolute; opacity: 0; width: 17px; height: 17px; margin: 0; }
.checkmark { width: 18px; height: 18px; border: 1px solid var(--border-md); border-radius: 5px; display: grid; place-items: center; transition: background .18s, border-color .18s; flex-shrink: 0; }
.checkbox-label input:focus-visible + .checkmark { outline: 3px solid color-mix(in srgb, var(--accent-solid) 30%, transparent); outline-offset: 2px; }
.checkbox-label input:checked + .checkmark { background: var(--accent-solid); border-color: var(--accent-solid); }
.checkbox-label input:checked + .checkmark::after { content: '✓'; color: #fff; font-size: 11px; font-weight: 700; }
.notice { padding: 11px 13px; border-radius: 9px; font-size: 12.5px; display: flex; align-items: center; gap: 9px; margin-bottom: 1rem; line-height: 1.45; }
.notice.ok { background: rgba(52,168,83,.1); border: 1px solid rgba(52,168,83,.3); color: #34a853; }
.notice.err, .error-notice { background: color-mix(in srgb, var(--red) 10%, transparent); border: 1px solid color-mix(in srgb, var(--red) 26%, transparent); color: var(--red); }
.notice.warn-notice { background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.3); color: #d89a22; }
.submit-btn { width: 100%; min-height: 49px; padding: 12px 16px; background: var(--accent-solid); border: 1px solid transparent; border-radius: 9px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .18s, transform .18s, box-shadow .18s; display: flex; align-items: center; justify-content: center; gap: 9px; margin-bottom: 1.15rem; box-shadow: 0 5px 14px color-mix(in srgb, var(--accent-solid) 22%, transparent); }
.submit-btn:not(:disabled):hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 8px 18px color-mix(in srgb, var(--accent-solid) 30%, transparent); }
.submit-btn:not(:disabled):active { transform: translateY(0); }
.submit-btn:disabled { opacity: .62; cursor: wait; box-shadow: none; }
.switch-text { font-size: 13px; color: var(--text-2); text-align: center; }
.switch-text a { color: var(--accent-solid); font-weight: 700; text-decoration: none; }
.switch-text a:hover { text-decoration: underline; }
.oauth-toast { background: color-mix(in srgb, var(--accent-solid) 9%, transparent); border: 1px solid color-mix(in srgb, var(--accent-solid) 22%, transparent); color: var(--text-1); padding: 11px 13px; border-radius: 9px; font-size: 12.5px; display: flex; align-items: center; gap: 9px; margin-bottom: .9rem; }
.auth-install { margin-top: 1rem; display: flex; }
.auth-install .ih-btn { width: 100%; }
@media (max-height: 820px) and (min-width: 1181px) { .das-left { padding-top: 1.5rem; padding-bottom: 1.5rem; } .auth-heading { font-size: 1.8rem; } .auth-sub { margin-bottom: 1.2rem; } .field { margin-bottom: .75rem; } }
</style>
