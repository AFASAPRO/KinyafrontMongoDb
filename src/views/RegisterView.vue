<template>
  <div class="auth-root" :class="{ light: isLight }">
    <div class="auth-left">
      <div class="auth-logo">
        <img src="/logo.png" alt="KinyaBot" class="logo-img" />
        <span class="logo-text">KinyaBot</span>
      </div>
      <div class="auth-form-wrap">
        <h1 class="auth-heading">Create account ✨</h1>
        <p class="auth-sub">Join KinyaBot and start your AI journey today.</p>
        <form @submit.prevent="handleRegister" novalidate>
          <div class="social-btns">
            <button type="button" class="social-btn"><i class="fab fa-google"></i><span>Sign up with Google</span></button>
            <button type="button" class="social-btn"><i class="fab fa-apple"></i><span>Sign up with Apple</span></button>
          </div>
          <div class="divider"><span>OR</span></div>
          <div class="field">
            <label class="field-label">Username</label>
            <input v-model="form.username" type="text" class="field-input" :class="{error:errors.username}" placeholder="yourname" autocomplete="username" />
            <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
          </div>
          <div class="field">
            <label class="field-label">Email</label>
            <input v-model="form.email" type="email" class="field-input" :class="{error:errors.email}" placeholder="your@email.com" autocomplete="email" />
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          </div>
          <div class="field">
            <label class="field-label">Password</label>
            <div class="pass-wrap">
              <input v-model="form.password" :type="showPass?'text':'password'" class="field-input" :class="{error:errors.password}" placeholder="Min. 8 characters" autocomplete="new-password" />
              <button type="button" class="eye-btn" @click="showPass=!showPass"><i :class="showPass?'far fa-eye-slash':'far fa-eye'"></i></button>
            </div>
            <div class="strength-bar" v-if="form.password"><div class="strength-fill" :style="{width:strength.pct+'%',background:strength.color}"></div></div>
            <span class="strength-txt" v-if="form.password" :style="{color:strength.color}">{{ strength.label }}</span>
            <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          </div>
          <div v-if="serverError" class="notice err"><i class="fas fa-circle-exclamation"></i> {{ serverError }}</div>
          <button type="submit" class="submit-btn" :disabled="loading">
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            {{ loading ? 'Creating…' : 'Create Account' }}
          </button>
        </form>
        <p class="switch-text">Already have an account? <router-link to="/login">Log in</router-link></p>
      </div>
    </div>
    <div class="auth-right">
      <div class="hero-content">
        <h2 class="hero-headline">Join KinyaBot.<br /><span class="g-text">Think Bigger.</span></h2>
        <p class="hero-desc">Your intelligent AI companion for conversations, code, creativity, and more — in English and beyond.</p>
        <div class="feature-list">
          <div class="feature-item" v-for="f in features" :key="f.text">
            <div class="feat-icon"><i :class="f.icon"></i></div>
            <span>{{ f.text }}</span>
          </div>
        </div>
      </div>
      <div class="hero-deco">
        <div class="deco-ring ring1"></div><div class="deco-ring ring2"></div>
        <div class="deco-cube"><img src="/logo.png" class="deco-logo" /></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ username:'', email:'', password:'' })
const errors = reactive({ username:'', email:'', password:'' })
const loading = ref(false); const showPass = ref(false); const serverError = ref('')
const isLight = computed(() => document.documentElement.classList.contains('light-mode'))
const features = [
  { icon:'fas fa-comments', text:'Context-aware multi-turn conversations' },
  { icon:'fas fa-code', text:'Code generation & debugging' },
  { icon:'fas fa-language', text:'English & multilingual support' },
  { icon:'fas fa-history', text:'Persistent chat history' },
]
const strength = computed(() => {
  const p=form.password; let s=0
  if(p.length>=8)s+=25;if(p.length>=12)s+=15;if(/[A-Z]/.test(p))s+=20;if(/[0-9]/.test(p))s+=20;if(/[^A-Za-z0-9]/.test(p))s+=20
  s=Math.min(s,100)
  const color=s<40?'#f28b82':s<70?'#fbbc04':'#34a853'
  const label=s<40?'Weak':s<70?'Fair':s<90?'Strong':'Very strong'
  return{pct:s,color,label}
})
function validate() {
  Object.keys(errors).forEach(k=>errors[k]=''); let ok=true
  if(!form.username||form.username.length<3){errors.username='At least 3 characters';ok=false}
  if(!form.email||!/^\S+@\S+\.\S+$/.test(form.email)){errors.email='Valid email required';ok=false}
  if(!form.password||form.password.length<8){errors.password='At least 8 characters';ok=false}
  return ok
}
async function handleRegister() {
  if(!validate())return; serverError.value=''; loading.value=true
  try {
    await auth.register(form.username,form.email,form.password)
    router.push('/onboarding') // Always go to onboarding after register
  } catch(err){ serverError.value=err.response?.data?.error||'Registration failed.' }
  finally{loading.value=false}
}
</script>

<style scoped>
.auth-root{display:flex;height:100vh;width:100vw;overflow:hidden;background:#0d0d0f;transition:background .3s}
.auth-root.light{background:#f0f2f5}
.auth-left{width:460px;min-width:460px;display:flex;flex-direction:column;padding:2rem 2.5rem;background:#111112;overflow-y:auto;transition:background .3s}
.auth-root.light .auth-left{background:#fff}
.auth-logo{display:flex;align-items:center;gap:10px;margin-bottom:1.75rem}
.logo-img{width:36px;height:36px;border-radius:9px;object-fit:cover}
.logo-text{font-size:1.15rem;font-weight:700;color:var(--text-1)}
.auth-root.light .logo-text{color:#1a1a2e}
.auth-form-wrap{flex:1;display:flex;flex-direction:column;justify-content:center;max-width:370px}
.auth-heading{font-size:1.65rem;font-weight:700;color:#fff;margin-bottom:5px}
.auth-root.light .auth-heading{color:#1a1a2e}
.auth-sub{font-size:13px;color:var(--text-2);margin-bottom:1.4rem}
.social-btns{display:flex;flex-direction:column;gap:9px;margin-bottom:1rem}
.social-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:10px 16px;background:#1e1f20;border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--text-1);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s}
.auth-root.light .social-btn{background:#f8f9fa;border-color:#e0e0e0;color:#202124}
.social-btn:hover{background:var(--bg-hover)}
.fa-google{color:#ea4335}.fa-apple{color:#fff}
.auth-root.light .fa-apple{color:#000}
.divider{display:flex;align-items:center;gap:10px;color:var(--text-3);font-size:12px;margin-bottom:1rem}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border-md)}
.field{margin-bottom:.8rem}
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
.strength-txt{font-size:11px;font-weight:600;display:block;margin-top:3px}
.notice.err{background:rgba(242,139,130,.1);border:1px solid rgba(242,139,130,.25);color:var(--red);padding:8px 12px;border-radius:var(--r-sm);font-size:12.5px;display:flex;align-items:center;gap:7px;margin-bottom:.8rem}
.submit-btn{width:100%;padding:11px;background:#3c3c42;border:1px solid rgba(255,255,255,.1);border-radius:var(--r-sm);color:var(--text-2);font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1rem}
.auth-root.light .submit-btn{background:#e8eaed;border-color:#dadce0;color:#5f6368}
.submit-btn:not(:disabled):hover{background:#6d28d9;border-color:#6d28d9;color:#fff}
.submit-btn:disabled{opacity:.55;cursor:not-allowed}
.switch-text{font-size:13px;color:var(--text-2);text-align:center}
.switch-text a{color:var(--blue);font-weight:500}
.auth-right{flex:1;background:#0d0d0f;display:flex;align-items:center;justify-content:space-around;padding:3rem;position:relative;overflow:hidden;transition:background .3s}
.auth-root.light .auth-right{background:#f0f2f5}
.auth-right::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(109,40,217,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,.04) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
.hero-content{position:relative;z-index:2;max-width:340px}
.hero-headline{font-size:clamp(1.4rem,2.6vw,2.1rem);font-weight:700;color:#fff;line-height:1.25;margin-bottom:.9rem}
.auth-root.light .hero-headline{color:#1a1a2e}
.hero-desc{font-size:13.5px;color:var(--text-2);line-height:1.75;margin-bottom:1.75rem}
.feature-list{display:flex;flex-direction:column;gap:11px}
.feature-item{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--text-2)}
.feat-icon{width:30px;height:30px;border-radius:8px;background:rgba(109,40,217,.18);border:1px solid rgba(109,40,217,.3);display:flex;align-items:center;justify-content:center;color:#c4b5fd;font-size:13px;flex-shrink:0}
.hero-deco{position:relative;z-index:2;width:230px;height:230px;display:flex;align-items:center;justify-content:center}
.deco-ring{position:absolute;border-radius:50%;border:1.5px solid rgba(109,40,217,.3);animation:spin linear infinite}
.ring1{width:200px;height:200px;animation-duration:14s}
.ring2{width:145px;height:145px;animation-duration:9s;animation-direction:reverse}
.deco-cube{width:80px;height:80px;background:linear-gradient(135deg,#1e1f24,#2a2b30);border-radius:20px;border:1px solid rgba(109,40,217,.4);display:flex;align-items:center;justify-content:center}
.auth-root.light .deco-cube{background:linear-gradient(135deg,#e8eaed,#f1f3f4)}
.deco-logo{width:54px;height:54px;object-fit:contain;border-radius:12px}
.g-text{background:linear-gradient(135deg,#4f46e5,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
@media(max-width:860px){.auth-right{display:none}.auth-left{width:100%;min-width:unset}.auth-form-wrap{max-width:100%}}
@media(max-width:480px){.auth-left{padding:1.5rem 1.25rem}}
</style>
