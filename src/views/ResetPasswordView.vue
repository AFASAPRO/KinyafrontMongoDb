<template>
  <AuthLayout>
    <transition name="au-slide" mode="out-in">
      <div v-if="!done" key="form">
        <div class="au-icon-badge is-green" aria-hidden="true"><i class="fas fa-lock-open"></i></div>
        <h1 class="au-title">New password</h1>
        <p class="au-lead">Create a strong new password for your account.</p>

        <div v-if="!token" class="au-notice is-warn" role="alert">
          <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
          <span>This reset link looks invalid or incomplete. <router-link to="/forgot-password" class="au-link">Request a new one</router-link>.</span>
        </div>

        <form @submit.prevent="submit" novalidate>
          <div class="au-field">
            <label class="au-label" for="rp-new">New password</label>
            <div class="au-inputbox">
              <i class="fas fa-lock au-input-icon" aria-hidden="true"></i>
              <input id="rp-new" v-model="password" :type="showPass ? 'text' : 'password'" class="au-input" placeholder="Min. 8 characters" autocomplete="new-password" />
              <button type="button" class="au-icon-btn" :aria-label="showPass ? 'Hide password' : 'Show password'" :aria-pressed="showPass" @click="showPass = !showPass">
                <i :class="showPass ? 'far fa-eye-slash' : 'far fa-eye'" aria-hidden="true"></i>
              </button>
            </div>
            <div v-if="password" aria-live="polite">
              <div class="au-strength" aria-hidden="true">
                <span v-for="n in 4" :key="n" :style="n <= strength.level ? { background: strength.color } : null"></span>
              </div>
              <p class="au-strength-label" :style="{ color: strength.color }">{{ strength.label }}</p>
            </div>
          </div>

          <div class="au-field">
            <label class="au-label" for="rp-confirm">Confirm password</label>
            <div class="au-inputbox" :class="{ 'is-error': mismatch, 'is-ok': confirm && !mismatch }">
              <i class="fas fa-lock au-input-icon" aria-hidden="true"></i>
              <input id="rp-confirm" v-model="confirm" type="password" class="au-input" placeholder="Repeat password" autocomplete="new-password" :aria-invalid="mismatch" />
              <i v-if="confirm && !mismatch" class="fas fa-check" style="color:var(--au-success)" aria-hidden="true"></i>
            </div>
            <p v-if="mismatch" class="au-error-text" role="alert"><i class="fas fa-circle-exclamation" aria-hidden="true"></i>Passwords don't match</p>
          </div>

          <div v-if="error" class="au-notice is-error" role="alert">
            <i class="fas fa-circle-exclamation" aria-hidden="true"></i><span>{{ error }}</span>
          </div>

          <button type="submit" class="au-btn au-btn-primary" :disabled="loading || !token || password.length < 8 || password !== confirm">
            <i v-if="loading" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <i v-else class="fas fa-check" aria-hidden="true"></i>
            {{ loading ? 'Saving…' : 'Reset password' }}
          </button>
        </form>
      </div>

      <div v-else key="done" class="au-done">
        <div class="au-icon-badge is-green" aria-hidden="true"><i class="fas fa-circle-check"></i></div>
        <h1 class="au-title">Password updated!</h1>
        <p class="au-lead">Your password has been changed successfully. You can now log in with your new password.</p>
        <router-link to="/login" class="au-btn au-btn-primary"><i class="fas fa-right-to-bracket" aria-hidden="true"></i>Go to login</router-link>
      </div>
    </transition>
  </AuthLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/auth/AuthLayout.vue'

const auth = useAuthStore()
const route = useRoute()
const token = ref('')
const password = ref('')
const confirm = ref('')
const showPass = ref(false)
const loading = ref(false)
const error = ref('')
const done = ref(false)

const mismatch = computed(() => !!confirm.value && confirm.value !== password.value)
const strength = computed(() => {
  const p = password.value
  let s = 0
  if (p.length >= 8) s += 25
  if (p.length >= 12) s += 15
  if (/[A-Z]/.test(p)) s += 20
  if (/[0-9]/.test(p)) s += 20
  if (/[^A-Za-z0-9]/.test(p)) s += 20
  s = Math.min(s, 100)
  const level = s === 0 ? 0 : s < 40 ? 1 : s < 70 ? 2 : s < 90 ? 3 : 4
  return { level, color: ['', '#f87171', '#fbbf24', '#34d399', '#10b981'][level], label: ['', 'Weak', 'Fair', 'Strong', 'Very strong'][level] }
})

onMounted(() => { token.value = route.query.token || '' })

async function submit() {
  if (!token.value) { error.value = 'Invalid reset link. Please request a new one.'; return }
  if (password.value.length < 8 || password.value !== confirm.value) return
  error.value = ''; loading.value = true
  try {
    await auth.resetPassword(token.value, password.value)
    done.value = true
  } catch (err) {
    error.value = err.response?.data?.error || 'Reset failed. The link may have expired.'
  } finally { loading.value = false }
}
</script>
