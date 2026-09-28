<template>
  <AuthLayout>
    <!-- Step indicator -->
    <ol v-if="step !== 'done'" class="au-steps" aria-label="Password reset progress">
      <template v-for="(s, i) in stepLabels" :key="s">
        <li class="au-step" :class="{ 'is-active': stepIndex >= i }" :aria-current="stepIndex === i ? 'step' : undefined">
          <span class="au-step-dot">
            <i v-if="stepIndex > i" class="fas fa-check" aria-hidden="true"></i>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span>{{ s }}</span>
        </li>
        <li v-if="i < stepLabels.length - 1" class="au-step-line" :class="{ 'is-filled': stepIndex > i }" aria-hidden="true"></li>
      </template>
    </ol>

    <transition name="au-slide" mode="out-in">
      <!-- ── STEP 1: Enter email ── -->
      <div v-if="step === 'email'" key="email">
        <div class="au-icon-badge is-blue" aria-hidden="true"><i class="fas fa-envelope-open-text"></i></div>
        <h1 class="au-title">Forgot password?</h1>
        <p class="au-lead">Enter your email and we'll send you a 6-digit reset code.</p>

        <form @submit.prevent="sendOtp" novalidate>
          <div class="au-field">
            <label class="au-label" for="fp-email">Email address</label>
            <div class="au-inputbox" :class="{ 'is-error': emailError }">
              <i class="far fa-envelope au-input-icon" aria-hidden="true"></i>
              <input
                id="fp-email" ref="emailInput" v-model.trim="email" type="email" class="au-input"
                placeholder="your@email.com" autocomplete="email" inputmode="email"
                autocapitalize="off" spellcheck="false"
                :aria-invalid="!!emailError" :aria-describedby="emailError ? 'fp-email-err' : undefined"
              />
            </div>
            <p v-if="emailError" id="fp-email-err" class="au-error-text" role="alert">
              <i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ emailError }}
            </p>
          </div>

          <div v-if="serverMsg" class="au-notice" :class="serverMsg.type === 'ok' ? 'is-ok' : 'is-error'" :role="serverMsg.type === 'ok' ? 'status' : 'alert'">
            <i :class="serverMsg.type === 'ok' ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'" aria-hidden="true"></i>
            <div>
              {{ serverMsg.text }}
              <div v-if="serverMsg.demoOtp" style="margin-top:.35rem">
                Dev mode — your code: <strong>{{ serverMsg.demoOtp }}</strong>
              </div>
            </div>
          </div>

          <button type="submit" class="au-btn au-btn-primary" :disabled="loading || !email">
            <i v-if="loading" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <i v-else class="fas fa-paper-plane" aria-hidden="true"></i>
            {{ loading ? 'Sending…' : 'Send reset code' }}
          </button>
        </form>

        <router-link to="/login" class="au-back"><i class="fas fa-arrow-left" aria-hidden="true"></i>Back to login</router-link>
      </div>

      <!-- ── STEP 2: Enter the 6-digit code ── -->
      <div v-else-if="step === 'otp'" key="otp">
        <div class="au-icon-badge" aria-hidden="true"><i class="fas fa-shield-halved"></i></div>
        <h1 class="au-title">Check your inbox</h1>
        <p class="au-lead">We sent a 6-digit code to <strong>{{ email }}</strong>. Enter it below to continue.</p>

        <div class="au-otp" role="group" aria-label="6-digit verification code">
          <input
            v-for="(_, i) in 6" :key="i"
            :ref="el => { if (el) otpRefs[i] = el }"
            type="text" maxlength="1" inputmode="numeric" autocomplete="one-time-code"
            class="au-otp-box"
            :class="{ 'is-filled': otpDigits[i], 'is-error': otpError }"
            :aria-label="`Digit ${i + 1} of 6`"
            :value="otpDigits[i]"
            @input="handleInput($event, i)"
            @keydown="handleKey($event, i)"
            @paste.prevent="handlePaste"
          />
        </div>

        <div v-if="otpError" class="au-notice is-error" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i><span>{{ otpError }}</span>
        </div>
        <div v-else-if="serverMsg && serverMsg.type === 'err'" class="au-notice is-error" role="alert">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i><span>{{ serverMsg.text }}</span>
        </div>

        <div class="au-resend">
          <span>Didn't receive it?</span>
          <button type="button" :disabled="resendTimer > 0 || loading" @click="sendOtp">
            {{ resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code' }}
          </button>
        </div>

        <button type="button" class="au-btn au-btn-primary" :disabled="loading || otpDigits.join('').length < 6" @click="verifyOtp">
          <i v-if="loading" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
          <i v-else class="fas fa-circle-check" aria-hidden="true"></i>
          {{ loading ? 'Verifying…' : 'Verify code' }}
        </button>

        <button type="button" class="au-back" @click="changeEmail">
          <i class="fas fa-arrow-left" aria-hidden="true"></i>Change email
        </button>
      </div>

      <!-- ── STEP 3: New password ── -->
      <div v-else-if="step === 'reset'" key="reset">
        <div class="au-icon-badge is-green" aria-hidden="true"><i class="fas fa-lock-open"></i></div>
        <h1 class="au-title">Create new password</h1>
        <p class="au-lead">Code verified! Enter a strong new password below.</p>

        <form @submit.prevent="doReset" novalidate>
          <div class="au-field">
            <label class="au-label" for="fp-new">New password</label>
            <div class="au-inputbox">
              <i class="fas fa-lock au-input-icon" aria-hidden="true"></i>
              <input id="fp-new" v-model="newPass" :type="showPass ? 'text' : 'password'" class="au-input" placeholder="Min. 8 characters" autocomplete="new-password" />
              <button type="button" class="au-icon-btn" :aria-label="showPass ? 'Hide password' : 'Show password'" :aria-pressed="showPass" @click="showPass = !showPass">
                <i :class="showPass ? 'far fa-eye-slash' : 'far fa-eye'" aria-hidden="true"></i>
              </button>
            </div>
            <div v-if="newPass" aria-live="polite">
              <div class="au-strength" aria-hidden="true">
                <span v-for="n in 4" :key="n" :style="n <= strength.level ? { background: strength.color } : null"></span>
              </div>
              <p class="au-strength-label" :style="{ color: strength.color }">{{ strength.label }}</p>
            </div>
          </div>

          <div class="au-field">
            <label class="au-label" for="fp-confirm">Confirm password</label>
            <div class="au-inputbox" :class="{ 'is-error': mismatch, 'is-ok': confirmPass && !mismatch }">
              <i class="fas fa-lock au-input-icon" aria-hidden="true"></i>
              <input id="fp-confirm" v-model="confirmPass" type="password" class="au-input" placeholder="Repeat password" autocomplete="new-password" :aria-invalid="mismatch" />
              <i v-if="confirmPass && !mismatch" class="fas fa-check" style="color:var(--au-success)" aria-hidden="true"></i>
            </div>
            <p v-if="mismatch" class="au-error-text" role="alert"><i class="fas fa-circle-exclamation" aria-hidden="true"></i>Passwords don't match</p>
          </div>

          <div v-if="resetError" class="au-notice is-error" role="alert">
            <i class="fas fa-circle-exclamation" aria-hidden="true"></i><span>{{ resetError }}</span>
          </div>

          <button type="submit" class="au-btn au-btn-primary" :disabled="loading || newPass.length < 8 || newPass !== confirmPass">
            <i v-if="loading" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <i v-else class="fas fa-check" aria-hidden="true"></i>
            {{ loading ? 'Saving…' : 'Reset password' }}
          </button>
        </form>
      </div>

      <!-- ── STEP 4: Done ── -->
      <div v-else key="done" class="au-done">
        <div class="au-icon-badge is-green" aria-hidden="true"><i class="fas fa-circle-check"></i></div>
        <h1 class="au-title">Password updated!</h1>
        <p class="au-lead">Your password has been changed successfully. You can now sign in with your new password.</p>
        <router-link to="/login" class="au-btn au-btn-primary"><i class="fas fa-right-to-bracket" aria-hidden="true"></i>Sign in</router-link>
      </div>
    </transition>
  </AuthLayout>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/auth/AuthLayout.vue'

const auth = useAuthStore()

const step          = ref('email')
const email         = ref('')
const emailInput    = ref(null)
const emailError    = ref('')
const serverMsg     = ref(null)
const loading       = ref(false)

const otpDigits     = ref(['', '', '', '', '', ''])
const otpRefs       = ref([])
const otpError      = ref('')
const resendTimer   = ref(0)
let   timerInterval = null

const resetToken    = ref('')
const newPass       = ref('')
const confirmPass   = ref('')
const showPass      = ref(false)
const resetError    = ref('')

const stepLabels = ['Send code', 'Verify', 'New password']
const stepIndex  = computed(() => ({ email: 0, otp: 1, reset: 2, done: 3 }[step.value] ?? 0))
const mismatch   = computed(() => !!confirmPass.value && confirmPass.value !== newPass.value)

const strength = computed(() => {
  const p = newPass.value
  let s = 0
  if (p.length >= 8)  s += 25
  if (p.length >= 12) s += 15
  if (/[A-Z]/.test(p)) s += 20
  if (/[0-9]/.test(p)) s += 20
  if (/[^A-Za-z0-9]/.test(p)) s += 20
  s = Math.min(s, 100)
  const level = s === 0 ? 0 : s < 40 ? 1 : s < 70 ? 2 : s < 90 ? 3 : 4
  return { level, color: ['', '#f87171', '#fbbf24', '#34d399', '#10b981'][level], label: ['', 'Weak', 'Fair', 'Strong', 'Very strong'][level] }
})

function startTimer() {
  clearInterval(timerInterval)
  resendTimer.value = 60
  timerInterval = setInterval(() => { if (--resendTimer.value <= 0) clearInterval(timerInterval) }, 1000)
}

async function sendOtp() {
  emailError.value = ''
  if (!/^\S+@\S+\.\S+$/.test(email.value)) { emailError.value = 'Enter a valid email address'; return }
  loading.value = true; serverMsg.value = null
  try {
    const res = await auth.forgotPassword(email.value)
    serverMsg.value = { type: 'ok', text: res.message || 'Code sent! Check your email inbox.', demoOtp: res.demo_otp }
    step.value = 'otp'
    startTimer()
    // Auto-fill for demo mode
    if (res.demo_otp) otpDigits.value = String(res.demo_otp).split('')
    await nextTick()
    otpRefs.value[Math.min(otpDigits.value.join('').length, 5)]?.focus()
  } catch {
    serverMsg.value = { type: 'err', text: 'Could not send code. Please try again.' }
  } finally { loading.value = false }
}

function changeEmail() {
  step.value = 'email'
  otpDigits.value = ['', '', '', '', '', '']
  otpError.value = ''
  serverMsg.value = null
  nextTick(() => emailInput.value?.focus())
}

function handleInput(e, i) {
  const val = e.target.value.replace(/\D/g, '')
  otpDigits.value[i] = val.slice(-1)
  e.target.value = otpDigits.value[i]
  otpError.value = ''
  if (val && i < 5) setTimeout(() => otpRefs.value[i + 1]?.focus(), 0)
}

function handleKey(e, i) {
  if (e.key === 'Backspace' && !otpDigits.value[i] && i > 0) {
    otpDigits.value[i - 1] = ''
    otpRefs.value[i - 1]?.focus()
  }
  if (e.key === 'ArrowLeft' && i > 0)  otpRefs.value[i - 1]?.focus()
  if (e.key === 'ArrowRight' && i < 5) otpRefs.value[i + 1]?.focus()
  if (e.key === 'Enter' && otpDigits.value.join('').length === 6) verifyOtp()
}

function handlePaste(e) {
  const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6)
  if (pasted) {
    otpDigits.value = pasted.split('').concat(Array(6 - pasted.length).fill(''))
    const lastFilled = Math.min(pasted.length, 5)
    setTimeout(() => otpRefs.value[lastFilled]?.focus(), 0)
  }
}

async function verifyOtp() {
  if (loading.value) return
  otpError.value = ''; loading.value = true
  try {
    const res = await auth.verifyOtp(email.value, otpDigits.value.join(''))
    resetToken.value = res.reset_token
    step.value = 'reset'
  } catch (err) {
    otpError.value = err.response?.data?.error || 'Invalid or expired code. Please try again.'
  } finally { loading.value = false }
}

async function doReset() {
  if (loading.value || newPass.value.length < 8 || newPass.value !== confirmPass.value) return
  resetError.value = ''; loading.value = true
  try {
    await auth.resetPassword(resetToken.value, newPass.value)
    step.value = 'done'
  } catch (err) {
    resetError.value = err.response?.data?.error || 'Reset failed. The code may have expired.'
  } finally { loading.value = false }
}

onMounted(() => emailInput.value?.focus())
onBeforeUnmount(() => clearInterval(timerInterval))
</script>
