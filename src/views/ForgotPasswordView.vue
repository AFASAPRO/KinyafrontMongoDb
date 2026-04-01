<template>
  <div class="fp-root">
    <!-- Background -->
    <div class="fp-bg">
      <div class="fp-orb fp-orb1"></div>
      <div class="fp-orb fp-orb2"></div>
      <div class="fp-grid"></div>
    </div>

    <!-- Card -->
    <div class="fp-card">

      <!-- Logo -->
      <div class="fp-logo">
        <img src="/logo.png" alt="KinyaBot"/>
        <span>KinyaBot</span>
        <span class="fp-powered">POWERED BY AFASA</span>
      </div>

      <!-- Step progress bar -->
      <div class="fp-steps" v-if="step !== 'done'">
        <div v-for="(s, i) in stepLabels" :key="s"
          class="fp-step"
          :class="{ active: stepIndex >= i, current: stepIndex === i }">
          <div class="fp-step-dot">
            <i v-if="stepIndex > i" class="fas fa-check"></i>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="fp-step-label">{{ s }}</span>
          <div v-if="i < stepLabels.length - 1" class="fp-step-line" :class="{ filled: stepIndex > i }"></div>
        </div>
      </div>

      <!-- ── STEP 1: Enter Email ── -->
      <transition name="slide" mode="out-in">
        <div v-if="step === 'email'" key="email" class="fp-body">
          <div class="fp-icon-wrap blue">
            <i class="fas fa-envelope-open-text"></i>
          </div>
          <h1 class="fp-title">Forgot Password?</h1>
          <p class="fp-sub">Enter your email and we'll send you a 6-digit reset code.</p>

          <div class="fp-field">
            <label>Email address</label>
            <div class="fp-input-wrap" :class="{error: emailError, focused: emailFocus}">
              <i class="fas fa-envelope"></i>
              <input v-model="email" type="email" placeholder="your@email.com"
                @focus="emailFocus=true" @blur="emailFocus=false"
                @keyup.enter="sendOtp" autofocus/>
            </div>
            <span v-if="emailError" class="fp-err">{{ emailError }}</span>
          </div>

          <div v-if="serverMsg" class="fp-notice" :class="serverMsg.type === 'ok' ? 'success' : 'error'">
            <i :class="serverMsg.type==='ok' ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'"></i>
            <div>
              {{ serverMsg.text }}
              <div v-if="serverMsg.demoOtp" class="demo-otp-row">
                <i class="fas fa-circle-info"></i>
                Dev mode — your code: <strong class="otp-reveal">{{ serverMsg.demoOtp }}</strong>
              </div>
            </div>
          </div>

          <button class="fp-btn" :disabled="loading || !email" @click="sendOtp">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-paper-plane"></i>
            {{ loading ? 'Sending…' : 'Send Reset Code' }}
          </button>

          <router-link to="/login" class="fp-back">
            <i class="fas fa-arrow-left"></i> Back to login
          </router-link>
        </div>
      </transition>

      <!-- ── STEP 2: Enter OTP ── -->
      <transition name="slide" mode="out-in">
        <div v-if="step === 'otp'" key="otp" class="fp-body">
          <div class="fp-icon-wrap purple">
            <i class="fas fa-shield-halved"></i>
          </div>
          <h1 class="fp-title">Check your inbox</h1>
          <p class="fp-sub">
            We sent a 6-digit code to <strong>{{ email }}</strong>.<br/>
            Enter it below to continue.
          </p>

          <!-- 6-box OTP input -->
          <div class="otp-row">
            <input
              v-for="(_, i) in 6" :key="i"
              :ref="el => { if(el) otpRefs[i] = el }"
              type="text" maxlength="1" inputmode="numeric"
              class="otp-box"
              :class="{ filled: otpDigits[i], error: otpError }"
              :value="otpDigits[i]"
              @input="handleInput($event, i)"
              @keydown="handleKey($event, i)"
              @paste.prevent="handlePaste"
            />
          </div>

          <div v-if="otpError" class="fp-notice error">
            <i class="fas fa-circle-exclamation"></i> {{ otpError }}
          </div>

          <div class="fp-resend">
            <span>Didn't receive it?</span>
            <button :disabled="resendTimer > 0" @click="sendOtp">
              {{ resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code' }}
            </button>
          </div>

          <button class="fp-btn"
            :disabled="loading || otpDigits.join('').length < 6"
            @click="verifyOtp">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-check-circle"></i>
            {{ loading ? 'Verifying…' : 'Verify Code' }}
          </button>

          <button class="fp-back" @click="step='email'; otpDigits=['','','','','','']; otpError=''">
            <i class="fas fa-arrow-left"></i> Change email
          </button>
        </div>
      </transition>

      <!-- ── STEP 3: New Password ── -->
      <transition name="slide" mode="out-in">
        <div v-if="step === 'reset'" key="reset" class="fp-body">
          <div class="fp-icon-wrap green">
            <i class="fas fa-lock-open"></i>
          </div>
          <h1 class="fp-title">Create New Password</h1>
          <p class="fp-sub">Code verified! Enter a strong new password below.</p>

          <div class="fp-field">
            <label>New Password</label>
            <div class="fp-input-wrap" :class="{focused: passFocus}">
              <i class="fas fa-lock"></i>
              <input :type="showPass?'text':'password'" v-model="newPass" placeholder="Min. 8 characters"
                @focus="passFocus=true" @blur="passFocus=false"/>
              <button type="button" class="fp-eye" @click="showPass=!showPass">
                <i :class="showPass?'far fa-eye-slash':'far fa-eye'"></i>
              </button>
            </div>
            <!-- Strength -->
            <div class="strength-bar" v-if="newPass">
              <div class="strength-fill" :style="{width:strength.pct+'%', background:strength.color}"></div>
            </div>
            <div class="strength-label" v-if="newPass" :style="{color:strength.color}">
              {{ strength.label }}
            </div>
          </div>

          <div class="fp-field">
            <label>Confirm Password</label>
            <div class="fp-input-wrap" :class="{error: confirmPass && confirmPass !== newPass, focused: confirmFocus}">
              <i class="fas fa-lock"></i>
              <input type="password" v-model="confirmPass" placeholder="Repeat password"
                @focus="confirmFocus=true" @blur="confirmFocus=false"
                @keyup.enter="doReset"/>
              <i v-if="confirmPass && confirmPass === newPass" class="fas fa-check" style="color:#34d399;margin-right:10px"></i>
            </div>
            <span v-if="confirmPass && confirmPass !== newPass" class="fp-err">Passwords don't match</span>
          </div>

          <div v-if="resetError" class="fp-notice error">
            <i class="fas fa-circle-exclamation"></i> {{ resetError }}
          </div>

          <button class="fp-btn"
            :disabled="loading || newPass.length < 8 || newPass !== confirmPass"
            @click="doReset">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-check"></i>
            {{ loading ? 'Saving…' : 'Reset Password' }}
          </button>
        </div>
      </transition>

      <!-- ── STEP 4: Done ── -->
      <transition name="slide" mode="out-in">
        <div v-if="step === 'done'" key="done" class="fp-body done-body">
          <div class="done-icon">
            <i class="fas fa-circle-check"></i>
          </div>
          <h1 class="fp-title">Password Updated!</h1>
          <p class="fp-sub">Your password has been changed successfully. You can now sign in with your new password.</p>
          <router-link to="/login" class="fp-btn">
            <i class="fas fa-right-to-bracket"></i> Sign In
          </router-link>
        </div>
      </transition>

    </div><!-- .fp-card -->
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const step          = ref('email')
const email         = ref('')
const emailError    = ref('')
const emailFocus    = ref(false)
const serverMsg     = ref(null)
const loading       = ref(false)

const otpDigits     = ref(['','','','','',''])
const otpRefs       = ref([])
const otpError      = ref('')
const resendTimer   = ref(0)
let   timerInterval = null

const resetToken    = ref('')
const newPass       = ref('')
const confirmPass   = ref('')
const showPass      = ref(false)
const passFocus     = ref(false)
const confirmFocus  = ref(false)
const resetError    = ref('')

const stepLabels = ['Send Code', 'Verify', 'New Password']
const stepIndex  = computed(() => ({ email:0, otp:1, reset:2, done:3 }[step.value] ?? 0))

const strength = computed(() => {
  const p = newPass.value; let s = 0
  if (p.length >= 8)  s += 25
  if (p.length >= 12) s += 15
  if (/[A-Z]/.test(p)) s += 20
  if (/[0-9]/.test(p)) s += 20
  if (/[^A-Za-z0-9]/.test(p)) s += 20
  s = Math.min(s, 100)
  const label = s < 40 ? 'Weak' : s < 70 ? 'Fair' : s < 90 ? 'Strong' : 'Very Strong'
  return { pct: s, label, color: s < 40 ? '#f87171' : s < 70 ? '#fcd34d' : '#34d399' }
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
    serverMsg.value = {
      type: 'ok',
      text: res.message || 'Code sent! Check your email inbox.',
      demoOtp: res.demo_otp
    }
    step.value = 'otp'
    startTimer()
    // Auto-fill for demo mode
    if (res.demo_otp) {
      const digits = String(res.demo_otp).split('')
      otpDigits.value = digits
    }
  } catch {
    serverMsg.value = { type: 'err', text: 'Could not send code. Please try again.' }
  } finally { loading.value = false }
}

function handleInput(e, i) {
  const val = e.target.value.replace(/\D/g, '')
  otpDigits.value[i] = val.slice(-1)
  otpError.value = ''
  if (val && i < 5) setTimeout(() => otpRefs.value[i+1]?.focus(), 0)
}

function handleKey(e, i) {
  if (e.key === 'Backspace' && !otpDigits.value[i] && i > 0) {
    otpDigits.value[i-1] = ''
    otpRefs.value[i-1]?.focus()
  }
  if (e.key === 'ArrowLeft' && i > 0)  otpRefs.value[i-1]?.focus()
  if (e.key === 'ArrowRight' && i < 5) otpRefs.value[i+1]?.focus()
}

function handlePaste(e) {
  const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6)
  if (pasted) {
    otpDigits.value = pasted.split('').concat(Array(6-pasted.length).fill(''))
    const lastFilled = Math.min(pasted.length, 5)
    setTimeout(() => otpRefs.value[lastFilled]?.focus(), 0)
  }
}

async function verifyOtp() {
  otpError.value = ''; loading.value = true
  try {
    const otp = otpDigits.value.join('')
    const res  = await auth.verifyOtp(email.value, otp)
    resetToken.value = res.reset_token
    step.value = 'reset'
  } catch (err) {
    otpError.value = err.response?.data?.error || 'Invalid or expired code. Please try again.'
  } finally { loading.value = false }
}

async function doReset() {
  resetError.value = ''; loading.value = true
  try {
    await auth.resetPassword(resetToken.value, newPass.value)
    step.value = 'done'
  } catch (err) {
    resetError.value = err.response?.data?.error || 'Reset failed. The code may have expired.'
  } finally { loading.value = false }
}

onBeforeUnmount(() => clearInterval(timerInterval))
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────── */
.fp-root {
  min-height: 100vh;
  background: #05060f;
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
  position: relative; overflow: hidden;
}
.fp-bg { position: absolute; inset: 0; pointer-events: none; }
.fp-orb { position: absolute; border-radius: 50%; filter: blur(100px); }
.fp-orb1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(79,70,229,.18), transparent); top: -150px; left: -100px; }
.fp-orb2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(168,85,247,.12), transparent); bottom: -80px; right: -80px; }
.fp-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* ── Card ─────────────────────────────────────────────────── */
.fp-card {
  background: rgba(10,10,20,.92);
  border: 1px solid rgba(99,102,241,.2);
  border-radius: 24px;
  padding: 2.5rem 2rem;
  width: min(460px, 100%);
  position: relative; z-index: 2;
  box-shadow: 0 0 60px rgba(79,70,229,.12), 0 32px 64px rgba(0,0,0,.6);
  backdrop-filter: blur(20px);
  animation: popIn .45s cubic-bezier(.34,1.56,.64,1);
}
@keyframes popIn { from{opacity:0;transform:scale(.96) translateY(16px)} to{opacity:1;transform:none} }

/* ── Logo ─────────────────────────────────────────────────── */
.fp-logo {
  display: flex; align-items: center; gap: 9px; margin-bottom: 1.75rem;
}
.fp-logo img { width: 30px; height: 30px; border-radius: 8px; object-fit: contain; }
.fp-logo span { font-size: 15px; font-weight: 800; color: #fff; }
.fp-powered { font-size: 9px; font-weight: 700; color: #6366f1; background: rgba(99,102,241,.12); padding: 2px 7px; border-radius: 99px; margin-left: 4px; letter-spacing: .06em; }

/* ── Step indicator ───────────────────────────────────────── */
.fp-steps {
  display: flex; align-items: center; margin-bottom: 2rem;
}
.fp-step {
  display: flex; align-items: center; gap: 6px; flex: 1;
}
.fp-step:last-child { flex: none; }
.fp-step-dot {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid rgba(99,102,241,.2);
  background: rgba(99,102,241,.05);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #4b5563;
  flex-shrink: 0; transition: all .3s;
}
.fp-step.active .fp-step-dot { border-color: #6366f1; background: rgba(99,102,241,.15); color: #a5b4fc; }
.fp-step.current .fp-step-dot { background: #6366f1; border-color: #6366f1; color: #fff; box-shadow: 0 0 12px rgba(99,102,241,.5); }
.fp-step-label { font-size: 11px; color: #4b5563; white-space: nowrap; }
.fp-step.active .fp-step-label { color: #a5b4fc; }
.fp-step-line { flex: 1; height: 2px; background: rgba(99,102,241,.12); border-radius: 99px; margin: 0 8px; transition: background .3s; }
.fp-step-line.filled { background: rgba(99,102,241,.5); }

/* ── Body ─────────────────────────────────────────────────── */
.fp-body { display: flex; flex-direction: column; gap: 1rem; }

.fp-icon-wrap {
  width: 60px; height: 60px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; margin-bottom: .25rem;
}
.fp-icon-wrap.blue   { background: rgba(6,182,212,.12);  border: 2px solid rgba(6,182,212,.3);  color: #67e8f9; }
.fp-icon-wrap.purple { background: rgba(99,102,241,.12); border: 2px solid rgba(99,102,241,.3); color: #a5b4fc; }
.fp-icon-wrap.green  { background: rgba(52,168,83,.12);  border: 2px solid rgba(52,168,83,.3);  color: #34d399; }

.fp-title { font-size: 1.5rem; font-weight: 800; color: #fff; letter-spacing: -.03em; margin: 0; }
.fp-sub   { font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0; }

/* ── Fields ───────────────────────────────────────────────── */
.fp-field { display: flex; flex-direction: column; gap: 6px; }
.fp-field label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
.fp-input-wrap {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(99,102,241,.15);
  border-radius: 11px; overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.fp-input-wrap > i { padding: 0 12px; color: #4b5563; font-size: 14px; flex-shrink: 0; }
.fp-input-wrap input { flex: 1; padding: 12px 10px 12px 0; background: none; border: none; outline: none; color: #e2e8f0; font-size: 14px; font-family: inherit; }
.fp-input-wrap input::placeholder { color: #374151; }
.fp-input-wrap.focused { border-color: rgba(99,102,241,.5); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
.fp-input-wrap.error   { border-color: rgba(239,68,68,.45); }
.fp-eye { background: none; border: none; color: #4b5563; padding: 10px 12px; cursor: pointer; transition: color .2s; }
.fp-eye:hover { color: #e2e8f0; }
.fp-err { font-size: 12px; color: #f87171; display: flex; align-items: center; gap: 5px; }

/* Strength */
.strength-bar { height: 3px; background: rgba(255,255,255,.08); border-radius: 99px; overflow: hidden; margin-top: 4px; }
.strength-fill { height: 100%; border-radius: 99px; transition: width .4s ease, background .4s ease; }
.strength-label { font-size: 11.5px; font-weight: 600; margin-top: 3px; }

/* ── OTP boxes ────────────────────────────────────────────── */
.otp-row { display: flex; gap: 10px; justify-content: center; }
.otp-box {
  width: 46px; height: 54px;
  text-align: center; font-size: 1.35rem; font-weight: 700;
  background: rgba(255,255,255,.04);
  border: 1.5px solid rgba(99,102,241,.2);
  border-radius: 10px; color: #e2e8f0;
  transition: all .2s; outline: none; font-family: monospace;
}
.otp-box:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); background: rgba(99,102,241,.08); }
.otp-box.filled { border-color: rgba(99,102,241,.5); background: rgba(99,102,241,.1); }
.otp-box.error  { border-color: #f87171; animation: shake .3s ease; }
@keyframes shake { 0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)} }

/* Resend row */
.fp-resend { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; }
.fp-resend button { background: none; border: none; color: #818cf8; font-size: 13px; cursor: pointer; padding: 0; transition: opacity .2s; }
.fp-resend button:disabled { opacity: .4; cursor: not-allowed; }
.fp-resend button:not(:disabled):hover { text-decoration: underline; }

/* ── Notices ──────────────────────────────────────────────── */
.fp-notice {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 11px 14px; border-radius: 10px; font-size: 13.5px;
}
.fp-notice.success { background: rgba(52,168,83,.1); border: 1px solid rgba(52,168,83,.25); color: #34d399; }
.fp-notice.error   { background: rgba(239,68,68,.1);  border: 1px solid rgba(239,68,68,.25);  color: #f87171; }
.fp-notice i { flex-shrink: 0; margin-top: 1px; }
.demo-otp-row { display: flex; align-items: center; gap: 7px; margin-top: 8px; font-size: 12.5px; color: #9ca3af; }
.otp-reveal { font-size: 1.1rem; letter-spacing: 4px; color: #c4b5fd; background: rgba(99,102,241,.15); padding: 2px 10px; border-radius: 6px; font-family: monospace; }

/* ── Button ───────────────────────────────────────────────── */
.fp-btn {
  width: 100%; padding: 13px;
  background: linear-gradient(135deg,#4f46e5,#7c3aed);
  border: none; border-radius: 11px; color: #fff;
  font-size: 14.5px; font-weight: 600; cursor: pointer;
  transition: all .22s; display: flex; align-items: center; justify-content: center; gap: 9px;
  font-family: inherit; text-decoration: none;
  box-shadow: 0 4px 20px rgba(79,70,229,.35);
}
.fp-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(79,70,229,.5); }
.fp-btn:disabled { opacity: .42; cursor: not-allowed; transform: none; }

/* Back link */
.fp-back {
  display: flex; align-items: center; gap: 7px; justify-content: center;
  font-size: 13px; color: #6b7280; background: none; border: none;
  cursor: pointer; transition: color .2s; font-family: inherit; text-decoration: none;
}
.fp-back:hover { color: #a5b4fc; }

/* ── Done state ───────────────────────────────────────────── */
.done-body { text-align: center; align-items: center; }
.done-icon { font-size: 4rem; color: #34d399; animation: popIn2 .6s cubic-bezier(.34,1.56,.64,1); }
@keyframes popIn2 { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }

/* ── Transition ───────────────────────────────────────────── */
.slide-enter-active, .slide-leave-active { transition: all .3s ease; }
.slide-enter-from { opacity: 0; transform: translateX(30px); }
.slide-leave-to   { opacity: 0; transform: translateX(-30px); }

/* Responsive */
@media(max-width:480px) {
  .fp-card { padding: 2rem 1.25rem; }
  .fp-title { font-size: 1.3rem; }
  .otp-box { width: 40px; height: 48px; font-size: 1.2rem; }
  .fp-step-label { display: none; }
}
</style>
