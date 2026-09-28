<template>
  <AuthLayout>
    <h1 class="au-title">Welcome back! <span aria-hidden="true">👋</span></h1>
    <p class="au-lead">Log in to KinyaBot to continue your AI journey.</p>

    <!-- Session expired while using the app → friendly notice, no black screen -->
    <div v-if="sessionExpiredNotice" class="au-notice is-warn" role="status">
      <i class="fas fa-clock" aria-hidden="true"></i>
      <span>Your session expired. Please sign in again to continue.</span>
    </div>

    <div class="au-social-group">
      <button type="button" class="au-social" :disabled="loading" @click="onSocial('Google')">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 7l7.1 5.5c4.2-3.8 7.1-9.5 7.1-17z"/>
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
        </svg>
        <span>Continue with Google</span>
      </button>
      <button type="button" class="au-social" :disabled="loading" @click="onSocial('Apple')">
        <i class="fab fa-apple" aria-hidden="true"></i>
        <span>Continue with Apple</span>
      </button>
    </div>

    <!-- Apple sign-in isn't wired up yet — say so instead of failing silently -->
    <div v-if="oauthNotice" class="au-notice is-info" role="status" style="margin-top:.8rem;margin-bottom:0">
      <i class="fas fa-circle-info" aria-hidden="true"></i>
      <span>{{ oauthNotice }} sign-in is coming soon. Please use email or Google for now.</span>
    </div>

    <div class="au-divider" role="separator"><span>OR</span></div>

    <form @submit.prevent="handleLogin" novalidate>
      <div class="au-field">
        <label class="au-label" for="login-email">Email</label>
        <div class="au-inputbox" :class="{ 'is-error': errors.email }">
          <i class="far fa-envelope au-input-icon" aria-hidden="true"></i>
          <input
            id="login-email" v-model.trim="form.email" type="email" class="au-input"
            placeholder="your@email.com" autocomplete="email" inputmode="email"
            autocapitalize="off" spellcheck="false"
            :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'login-email-err' : undefined"
          />
        </div>
        <p v-if="errors.email" id="login-email-err" class="au-error-text" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ errors.email }}
        </p>
      </div>

      <div class="au-field">
        <div class="au-label-row">
          <label class="au-label" for="login-password">Password</label>
          <router-link to="/forgot-password" class="au-link">Forgot password?</router-link>
        </div>
        <div class="au-inputbox" :class="{ 'is-error': errors.password }">
          <i class="fas fa-lock au-input-icon" aria-hidden="true"></i>
          <input
            id="login-password" v-model="form.password" :type="showPass ? 'text' : 'password'" class="au-input"
            placeholder="••••••••" autocomplete="current-password"
            :aria-invalid="!!errors.password" :aria-describedby="errors.password ? 'login-password-err' : undefined"
          />
          <button type="button" class="au-icon-btn" :aria-label="showPass ? 'Hide password' : 'Show password'" :aria-pressed="showPass" @click="showPass = !showPass">
            <i :class="showPass ? 'far fa-eye-slash' : 'far fa-eye'" aria-hidden="true"></i>
          </button>
        </div>
        <p v-if="errors.password" id="login-password-err" class="au-error-text" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ errors.password }}
        </p>
      </div>

      <label class="au-check">
        <input type="checkbox" v-model="rememberMe" />
        <span class="au-check-box" aria-hidden="true"></span>
        <span>Remember me for 30 days</span>
      </label>

      <div v-if="serverError" class="au-notice is-error" role="alert">
        <i class="fas fa-circle-exclamation" aria-hidden="true"></i><span>{{ serverError }}</span>
      </div>

      <button type="submit" class="au-btn au-btn-primary" :disabled="loading">
        <i v-if="loading" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>
    </form>

    <p class="au-switch">Don't have an account? <router-link to="/register">Create one</router-link></p>

    <!-- PWA install (Chromium: native prompt · iOS: instructions) -->
    <div v-if="showInstall" class="au-install">
      <InstallHint variant="button" label="Install KinyaBot App" compact />
    </div>
  </AuthLayout>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePwaInstall } from '../composables/usePwaInstall'
import InstallHint from '../components/InstallHint.vue'
import AuthLayout from '../components/auth/AuthLayout.vue'

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
const oauthNotice = ref('')

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

async function onSocial(provider) {
  if (provider !== 'Google') {
    oauthNotice.value = provider
    setTimeout(() => { oauthNotice.value = '' }, 4000)
    return
  }
  serverError.value = ''; loading.value = true
  try {
    afterAuth(await auth.loginWithGoogle())
  } catch (err) {
    // Closing the Google popup isn't an error worth shouting about
    if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
      serverError.value = err.response?.data?.error || 'Google login failed. Please try again.'
    }
  } finally { loading.value = false }
}

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
    afterAuth(await auth.login(form.email, form.password, rememberMe.value))
  } catch (err) {
    serverError.value = err.response?.data?.error || 'Login failed. Please try again.'
  } finally { loading.value = false }
}
</script>
