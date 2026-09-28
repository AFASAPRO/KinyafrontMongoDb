<template>
  <AuthLayout>
    <h1 class="au-title">Create account <span aria-hidden="true">✨</span></h1>
    <p class="au-lead">Join KinyaBot and start your AI journey today.</p>

    <div class="au-social-group">
      <button type="button" class="au-social" :disabled="loading" @click="onSocial('Google')">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 7l7.1 5.5c4.2-3.8 7.1-9.5 7.1-17z"/>
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
        </svg>
        <span>Sign up with Google</span>
      </button>
      <button type="button" class="au-social" :disabled="loading" @click="onSocial('Apple')">
        <i class="fab fa-apple" aria-hidden="true"></i>
        <span>Sign up with Apple</span>
      </button>
    </div>

    <div v-if="oauthNotice" class="au-notice is-info" role="status" style="margin-top:.8rem;margin-bottom:0">
      <i class="fas fa-circle-info" aria-hidden="true"></i>
      <span>{{ oauthNotice }} sign-up is coming soon. Please use email or Google for now.</span>
    </div>

    <div class="au-divider" role="separator"><span>OR</span></div>

    <form @submit.prevent="handleRegister" novalidate>
      <div class="au-field">
        <label class="au-label" for="reg-username">Username</label>
        <div class="au-inputbox" :class="{ 'is-error': errors.username }">
          <i class="far fa-user au-input-icon" aria-hidden="true"></i>
          <input
            id="reg-username" v-model.trim="form.username" type="text" class="au-input"
            placeholder="yourname" autocomplete="username" autocapitalize="off" spellcheck="false"
            :aria-invalid="!!errors.username" :aria-describedby="errors.username ? 'reg-username-err' : undefined"
          />
        </div>
        <p v-if="errors.username" id="reg-username-err" class="au-error-text" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ errors.username }}
        </p>
      </div>

      <div class="au-field">
        <label class="au-label" for="reg-email">Email</label>
        <div class="au-inputbox" :class="{ 'is-error': errors.email }">
          <i class="far fa-envelope au-input-icon" aria-hidden="true"></i>
          <input
            id="reg-email" v-model.trim="form.email" type="email" class="au-input"
            placeholder="your@email.com" autocomplete="email" inputmode="email"
            autocapitalize="off" spellcheck="false"
            :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'reg-email-err' : undefined"
          />
        </div>
        <p v-if="errors.email" id="reg-email-err" class="au-error-text" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ errors.email }}
        </p>
      </div>

      <div class="au-field">
        <label class="au-label" for="reg-password">Password</label>
        <div class="au-inputbox" :class="{ 'is-error': errors.password }">
          <i class="fas fa-lock au-input-icon" aria-hidden="true"></i>
          <input
            id="reg-password" v-model="form.password" :type="showPass ? 'text' : 'password'" class="au-input"
            placeholder="Min. 8 characters" autocomplete="new-password"
            :aria-invalid="!!errors.password" :aria-describedby="errors.password ? 'reg-password-err' : 'reg-password-strength'"
          />
          <button type="button" class="au-icon-btn" :aria-label="showPass ? 'Hide password' : 'Show password'" :aria-pressed="showPass" @click="showPass = !showPass">
            <i :class="showPass ? 'far fa-eye-slash' : 'far fa-eye'" aria-hidden="true"></i>
          </button>
        </div>
        <div v-if="form.password" id="reg-password-strength" aria-live="polite">
          <div class="au-strength" aria-hidden="true">
            <span v-for="n in 4" :key="n" :style="n <= strength.level ? { background: strength.color } : null"></span>
          </div>
          <p class="au-strength-label" :style="{ color: strength.color }">{{ strength.label }}</p>
        </div>
        <p v-if="errors.password" id="reg-password-err" class="au-error-text" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ errors.password }}
        </p>
      </div>

      <div v-if="serverError" class="au-notice is-error" role="alert" style="margin-top:1rem">
        <i class="fas fa-circle-exclamation" aria-hidden="true"></i><span>{{ serverError }}</span>
      </div>

      <button type="submit" class="au-btn au-btn-primary" style="margin-top:1.15rem" :disabled="loading">
        <i v-if="loading" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
        {{ loading ? 'Creating…' : 'Create Account' }}
      </button>
    </form>

    <p class="au-switch">Already have an account? <router-link to="/login">Log in</router-link></p>
  </AuthLayout>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/auth/AuthLayout.vue'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: '', email: '', password: '' })
const errors = reactive({ username: '', email: '', password: '' })
const loading = ref(false)
const showPass = ref(false)
const serverError = ref('')
const oauthNotice = ref('')

const strength = computed(() => {
  const p = form.password
  let s = 0
  if (p.length >= 8) s += 25
  if (p.length >= 12) s += 15
  if (/[A-Z]/.test(p)) s += 20
  if (/[0-9]/.test(p)) s += 20
  if (/[^A-Za-z0-9]/.test(p)) s += 20
  s = Math.min(s, 100)
  const level = s === 0 ? 0 : s < 40 ? 1 : s < 70 ? 2 : s < 90 ? 3 : 4
  const color = ['', '#f87171', '#fbbf24', '#34d399', '#10b981'][level]
  const label = ['', 'Weak', 'Fair', 'Strong', 'Very strong'][level]
  return { level, color, label }
})

function validate() {
  Object.keys(errors).forEach(k => (errors[k] = ''))
  let ok = true
  if (!form.username || form.username.length < 3) { errors.username = 'At least 3 characters'; ok = false }
  if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) { errors.email = 'Valid email required'; ok = false }
  if (!form.password || form.password.length < 8) { errors.password = 'At least 8 characters'; ok = false }
  return ok
}

async function onSocial(provider) {
  if (provider !== 'Google') {
    oauthNotice.value = provider
    setTimeout(() => { oauthNotice.value = '' }, 4000)
    return
  }
  // The backend's /auth/google creates the account if it doesn't exist yet
  serverError.value = ''; loading.value = true
  try {
    const result = await auth.loginWithGoogle()
    router.push(result.user.onboarded ? '/' : '/onboarding')
  } catch (err) {
    if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
      serverError.value = err.response?.data?.error || 'Google sign-up failed. Please try again.'
    }
  } finally { loading.value = false }
}

async function handleRegister() {
  if (!validate()) return
  serverError.value = ''; loading.value = true
  try {
    await auth.register(form.username, form.email, form.password)
    router.push('/onboarding') // Always go to onboarding after register
  } catch (err) {
    serverError.value = err.response?.data?.error || 'Registration failed.'
  } finally { loading.value = false }
}
</script>
