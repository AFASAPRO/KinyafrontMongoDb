<template>
  <div class="auth-root" :class="{ light: isLight }">
    <div class="auth-left">
      <div class="auth-logo">
        <img src="/logo.png" alt="KinyaBot" class="logo-img" />
        <span class="logo-text">KinyaBot</span>
      </div>
      <div class="auth-form-wrap">
        <div v-if="!done">
          <div class="step-icon"><i class="fas fa-lock-open"></i></div>
          <h1 class="auth-heading">New password</h1>
          <p class="auth-sub">Create a strong new password for your account.</p>
          <div class="field">
            <label class="field-label">New Password</label>
            <div class="pass-wrap">
              <input v-model="password" :type="showPass?'text':'password'" class="field-input" placeholder="Min. 8 characters" />
              <button type="button" class="eye-btn" @click="showPass=!showPass">
                <i :class="showPass?'far fa-eye-slash':'far fa-eye'"></i>
              </button>
            </div>
            <div class="strength-bar" v-if="password">
              <div class="strength-fill" :style="{width:strength.pct+'%',background:strength.color}"></div>
            </div>
          </div>
          <div class="field">
            <label class="field-label">Confirm Password</label>
            <input v-model="confirm" type="password" class="field-input"
              :class="{error:confirm&&confirm!==password}" placeholder="Repeat password"
              @keyup.enter="submit" />
            <span v-if="confirm && confirm!==password" class="field-error">Passwords don't match</span>
          </div>
          <div v-if="error" class="notice err"><i class="fas fa-circle-exclamation"></i> {{ error }}</div>
          <button class="submit-btn" :disabled="loading||!token||password.length<8||password!==confirm" @click="submit">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-check"></i>
            {{ loading ? 'Saving…' : 'Reset Password' }}
          </button>
        </div>
        <div v-else class="success-state">
          <div class="success-icon"><i class="fas fa-circle-check"></i></div>
          <h2>Password Updated!</h2>
          <p>Your password has been changed successfully. You can now log in with your new password.</p>
          <button class="submit-btn" @click="$router.push('/login')">
            <i class="fas fa-right-to-bracket"></i> Go to Login
          </button>
        </div>
      </div>
    </div>
    <div class="auth-right">
      <div class="hero-deco">
        <div class="deco-ring ring1"></div>
        <div class="deco-ring ring2"></div>
        <div class="deco-cube"><img src="/logo.png" class="deco-logo" /></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const token = ref('')
const password = ref('')
const confirm = ref('')
const showPass = ref(false)
const loading = ref(false)
const error = ref('')
const done = ref(false)
const isLight = computed(() => document.documentElement.classList.contains('light-mode'))

const strength = computed(() => {
  const p = password.value; let s = 0
  if(p.length>=8)s+=25; if(p.length>=12)s+=15
  if(/[A-Z]/.test(p))s+=20; if(/[0-9]/.test(p))s+=20; if(/[^A-Za-z0-9]/.test(p))s+=20
  s = Math.min(s,100)
  return { pct:s, color:s<40?'#f28b82':s<70?'#fbbc04':'#34a853' }
})

onMounted(() => { token.value = route.query.token || '' })

async function submit() {
  if (!token.value) { error.value = 'Invalid reset link. Please request a new one.'; return }
  error.value = ''; loading.value = true
  try {
    await auth.resetPassword(token.value, password.value)
    done.value = true
  } catch(err) {
    error.value = err.response?.data?.error || 'Reset failed. The link may have expired.'
  } finally { loading.value = false }
}
</script>

<style scoped>
.auth-root{display:flex;height:100vh;width:100vw;overflow:hidden;background:#0d0d0f;transition:background .3s}
.auth-root.light{background:#f0f2f5}
.auth-left{width:460px;min-width:460px;display:flex;flex-direction:column;padding:2rem 2.5rem;background:#111112;overflow-y:auto;transition:background .3s}
.auth-root.light .auth-left{background:#fff}
.auth-logo{display:flex;align-items:center;gap:10px;margin-bottom:2rem}
.logo-img{width:36px;height:36px;border-radius:9px;object-fit:cover}
.logo-text{font-size:1.15rem;font-weight:700;color:var(--text-1)}
.auth-root.light .logo-text{color:#1a1a2e}
.auth-form-wrap{flex:1;display:flex;flex-direction:column;justify-content:center;max-width:370px}
.step-icon{width:60px;height:60px;border-radius:50%;background:rgba(109,40,217,.15);border:2px solid rgba(109,40,217,.35);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#c4b5fd;margin-bottom:1.25rem}
.auth-heading{font-size:1.65rem;font-weight:700;color:#fff;margin-bottom:5px}
.auth-root.light .auth-heading{color:#1a1a2e}
.auth-sub{font-size:13px;color:var(--text-2);margin-bottom:1.5rem}
.field{margin-bottom:.9rem}
.field-label{display:block;font-size:13px;font-weight:500;color:var(--text-2);margin-bottom:5px}
.field-input{width:100%;padding:10px 13px;background:#1a1a1c;border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--text-1);font-size:13.5px;outline:none;transition:border-color .2s,box-shadow .2s}
.auth-root.light .field-input{background:#f8f9fa;border-color:#dadce0;color:#202124}
.field-input::placeholder{color:var(--text-3)}
.field-input:focus{border-color:#6d28d9;box-shadow:0 0 0 3px rgba(109,40,217,.18)}
.field-input.error{border-color:var(--red)}
.field-error{font-size:11.5px;color:var(--red);margin-top:3px;display:block}
.pass-wrap{position:relative}
.pass-wrap .field-input{padding-right:42px}
.eye-btn{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;color:var(--text-2);font-size:14px;padding:4px;transition:color .2s}
.strength-bar{height:3px;background:var(--border-md);border-radius:99px;margin-top:5px;overflow:hidden}
.strength-fill{height:100%;border-radius:99px;transition:width .4s,background .4s}
.notice.err{background:rgba(242,139,130,.1);border:1px solid rgba(242,139,130,.25);color:var(--red);padding:9px 12px;border-radius:var(--r-sm);font-size:12.5px;display:flex;align-items:center;gap:7px;margin-bottom:.9rem}
.submit-btn{width:100%;padding:11px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;border-radius:var(--r-sm);color:#fff;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1.1rem}
.submit-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.4)}
.submit-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.success-state{text-align:center;padding:2rem 0}
.success-icon{font-size:3.5rem;color:#34d399;margin-bottom:1.25rem;animation:popIn .5s cubic-bezier(.34,1.56,.64,1)}
@keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.success-state h2{font-size:1.5rem;font-weight:700;color:#fff;margin-bottom:.6rem}
.auth-root.light .success-state h2{color:#1a1a2e}
.success-state p{font-size:13.5px;color:var(--text-2);margin-bottom:1.5rem;line-height:1.65}
.auth-right{flex:1;background:#0d0d0f;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;transition:background .3s}
.auth-root.light .auth-right{background:#f0f2f5}
.hero-deco{position:relative;width:240px;height:240px;display:flex;align-items:center;justify-content:center}
.deco-ring{position:absolute;border-radius:50%;border:1.5px solid rgba(109,40,217,.3);animation:spin linear infinite}
.ring1{width:210px;height:210px;animation-duration:14s}
.ring2{width:150px;height:150px;animation-duration:9s;animation-direction:reverse}
.deco-cube{width:84px;height:84px;background:linear-gradient(135deg,#1e1f24,#2a2b30);border-radius:20px;border:1px solid rgba(109,40,217,.4);display:flex;align-items:center;justify-content:center}
.auth-root.light .deco-cube{background:linear-gradient(135deg,#e8eaed,#f1f3f4)}
.deco-logo{width:56px;height:56px;object-fit:contain;border-radius:12px}
@media(max-width:860px){.auth-right{display:none}.auth-left{width:100%;min-width:unset}.auth-form-wrap{max-width:100%}}
</style>
