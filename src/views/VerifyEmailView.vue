<template>
  <!-- ═══ MOBILE LAYOUT (≤768px) ═══ -->
  <MobileAuthShell v-if="isMobile" title="Verify your email" subtitle="One quick step before you get started.">
    <div class="m-center">
      <div class="m-bigicon"><i class="fas fa-envelope-circle-check"></i></div>
      <p class="m-switch" style="margin:0 0 20px">
        We sent a 6-digit code to<br /><strong>{{ email }}</strong>
      </p>

      <div class="otp-row">
        <input v-for="(_, i) in 6" :key="i" :ref="el => { if (el) otpRefs[i] = el }"
          type="text" maxlength="1" inputmode="numeric" class="otp-box"
          :class="{ filled: otpDigits[i], error: otpError }" :value="otpDigits[i]"
          @input="handleInput($event, i)" @keydown="handleKey($event, i)" @paste.prevent="handlePaste" />
      </div>

      <div v-if="otpError" class="m-notice err"><i class="fas fa-circle-exclamation"></i><span>{{ otpError }}</span></div>
      <div v-if="demoOtp" class="m-notice info"><i class="fas fa-circle-info"></i><span>Email isn't configured yet — demo code: <strong>{{ demoOtp }}</strong></span></div>

      <button class="m-btn" :disabled="loading || otpDigits.join('').length < 6" @click="handleVerify">
        <i v-if="loading" class="fas fa-spinner fa-spin"></i>
        {{ loading ? 'Verifying…' : 'Verify & Continue' }}
      </button>

      <p class="m-switch">
        Didn't get it?
        <a href="#" @click.prevent="resend" :style="resendTimer > 0 ? 'opacity:.5;pointer-events:none' : ''">
          {{ resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code' }}
        </a>
      </p>
    </div>
  </MobileAuthShell>

  <!-- ═══ DESKTOP LAYOUT ═══ -->
  <DesktopAuthShell v-else>
    <div class="auth-form-wrap">
      <h1 class="auth-heading">We sent you a code</h1>
      <p class="auth-sub">{{ sending ? 'Please wait…' : `Enter the 6-digit code we sent to ` }}<strong v-if="!sending">{{ email }}</strong></p>

      <div class="otp-row">
        <input v-for="(_, i) in 6" :key="i" :ref="el => { if (el) otpRefs[i] = el }"
          type="text" maxlength="1" inputmode="numeric" class="otp-box"
          :class="{ filled: otpDigits[i], error: otpError }" :value="otpDigits[i]"
          @input="handleInput($event, i)" @keydown="handleKey($event, i)" @paste.prevent="handlePaste" />
      </div>

      <div v-if="otpError" class="notice err-notice"><i class="fas fa-circle-exclamation"></i> {{ otpError }}</div>
      <div v-if="demoOtp" class="notice info-notice"><i class="fas fa-circle-info"></i> Email isn't configured yet — demo code: <strong>{{ demoOtp }}</strong></div>

      <button class="resend-link" :disabled="resendTimer > 0" @click="resend">
        {{ resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code' }}
      </button>

      <div class="btn-row">
        <button class="back-btn" type="button" @click="$router.back()">Back</button>
        <button class="submit-btn" :disabled="loading || otpDigits.join('').length < 6" @click="handleVerify">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ loading ? 'Verifying…' : 'Continue' }}
        </button>
      </div>
    </div>
  </DesktopAuthShell>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import MobileAuthShell from '../components/mobile/MobileAuthShell.vue'
import DesktopAuthShell from '../components/desktop/DesktopAuthShell.vue'
import { useIsMobile } from '../composables/useIsMobile'

const isMobile = useIsMobile()
const router = useRouter()
const auth = useAuthStore()

const email = auth.user?.email || ''
const otpDigits = ref(['', '', '', '', '', ''])
const otpRefs = ref([])
const otpError = ref('')
const loading = ref(false)
const sending = ref(false)
const demoOtp = ref('')
const resendTimer = ref(0)
let timerHandle = null

function startCooldown() {
  resendTimer.value = 45
  clearInterval(timerHandle)
  timerHandle = setInterval(() => {
    resendTimer.value--
    if (resendTimer.value <= 0) clearInterval(timerHandle)
  }, 1000)
}

async function sendCode() {
  sending.value = true
  otpError.value = ''
  try {
    const data = await auth.sendVerification()
    if (data?.demo_otp) demoOtp.value = data.demo_otp
    startCooldown()
  } catch (err) {
    otpError.value = err.response?.data?.error || 'Could not send the code. Please try again.'
  } finally {
    sending.value = false
  }
}
async function resend() {
  if (resendTimer.value > 0) return
  otpDigits.value = ['', '', '', '', '', '']
  await sendCode()
  nextTick(() => otpRefs.value[0]?.focus())
}

function handleInput(e, i) {
  const val = e.target.value.replace(/\D/g, '')
  otpDigits.value[i] = val.slice(-1)
  otpError.value = ''
  if (val && i < 5) otpRefs.value[i + 1]?.focus()
  if (otpDigits.value.join('').length === 6) handleVerify()
}
function handleKey(e, i) {
  if (e.key === 'Backspace' && !otpDigits.value[i] && i > 0) {
    otpDigits.value[i - 1] = ''
    otpRefs.value[i - 1]?.focus()
  }
}
function handlePaste(e) {
  const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
  if (pasted) {
    otpDigits.value = pasted.split('').concat(Array(6 - pasted.length).fill(''))
    nextTick(() => otpRefs.value[Math.min(pasted.length, 5)]?.focus())
    if (pasted.length === 6) handleVerify()
  }
}

async function handleVerify() {
  if (otpDigits.value.join('').length < 6 || loading.value) return
  loading.value = true
  otpError.value = ''
  try {
    await auth.verifyEmail(otpDigits.value.join(''))
    router.push(auth.needsOnboarding ? '/onboarding' : '/')
  } catch (err) {
    otpError.value = err.response?.data?.error || 'Invalid or expired code.'
  } finally {
    loading.value = false
  }
}

onMounted(() => { sendCode(); nextTick(() => otpRefs.value[0]?.focus()) })
</script>

<style scoped>
.otp-row { display: flex; gap: 9px; justify-content: center; margin: 4px 0 16px; }
.otp-box {
  width: 44px; height: 52px; text-align: center; font-size: 1.25rem; font-weight: 700;
  background: var(--bg-card); border: 1.5px solid var(--border-md); border-radius: 12px;
  color: var(--text-1); outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
}
.otp-box:focus { border-color: var(--accent-solid); box-shadow: 0 0 0 3px rgba(109,40,217,.16); }
.otp-box.filled { border-color: var(--accent-solid); background: rgba(109,40,217,.08); }
.otp-box.error { border-color: var(--red); animation: shake .3s ease; }
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }

.notice { padding: 9px 12px; border-radius: 10px; font-size: 12.5px; display: flex; align-items: center; gap: 7px; margin-bottom: .9rem; text-align: left; }
.err-notice { background: rgba(242,139,130,.1); border: 1px solid rgba(242,139,130,.25); color: var(--red); }
.info-notice { background: rgba(109,40,217,.1); border: 1px solid rgba(109,40,217,.25); color: var(--purple); }

.resend-link { display: block; margin: 0 auto 1.4rem; background: none; color: var(--purple); font-size: 13px; font-weight: 600; }
.resend-link:disabled { color: var(--text-3); cursor: default; }
.resend-link:not(:disabled):hover { text-decoration: underline; }

.btn-row { display: flex; gap: 10px; }
.back-btn { flex: 0 0 auto; padding: 12px 20px; background: var(--bg-card); border: 1px solid var(--border-md); border-radius: var(--r-sm); color: var(--text-1); font-size: 14px; font-weight: 600; transition: background .2s; }
.back-btn:hover { background: var(--bg-hover); }
.submit-btn { flex: 1; padding: 12px; background: var(--accent-solid); border: none; border-radius: var(--r-sm); color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .2s; }
.submit-btn:not(:disabled):hover { opacity: .92; }
.submit-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
