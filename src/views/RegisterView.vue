<template>
  <!-- ═══ MOBILE LAYOUT (≤768px) ═══ -->
  <MobileAuthShell v-if="isMobile" title="Sign up" subtitle="Create your account and start chatting.">
    <form @submit.prevent="handleRegister" novalidate>
      <div class="m-field">
        <label class="m-label" for="r-user">Username</label>
        <div class="m-input-wrap">
          <i class="m-ic fas fa-user"></i>
          <input id="r-user" v-model="form.username" type="text" class="m-input has-ic" :class="{error:errors.username}" placeholder="yourname" autocomplete="username" autocapitalize="none" />
        </div>
        <span v-if="errors.username" class="m-err">{{ errors.username }}</span>
      </div>
      <div class="m-field">
        <label class="m-label" for="r-email">Email</label>
        <div class="m-input-wrap">
          <i class="m-ic fas fa-envelope"></i>
          <input id="r-email" v-model="form.email" type="email" inputmode="email" class="m-input has-ic" :class="{error:errors.email}" placeholder="your@email.com" autocomplete="email" autocapitalize="none" />
        </div>
        <span v-if="errors.email" class="m-err">{{ errors.email }}</span>
      </div>
      <div class="m-field">
        <label class="m-label" for="r-pass">Password</label>
        <div class="m-input-wrap">
          <i class="m-ic fas fa-lock"></i>
          <input id="r-pass" v-model="form.password" :type="showPass?'text':'password'" class="m-input has-ic" :class="{error:errors.password}" placeholder="Min. 8 characters" autocomplete="new-password" />
          <button type="button" class="m-eye" @click="showPass=!showPass" :aria-label="showPass?'Hide password':'Show password'">
            <i :class="showPass?'far fa-eye-slash':'far fa-eye'"></i>
          </button>
        </div>
        <div v-if="form.password" class="m-strength"><div :style="{width:strength.pct+'%',background:strength.color}"></div></div>
        <span v-if="form.password" class="m-strength-txt" :style="{color:strength.color}">{{ strength.label }}</span>
        <span v-if="errors.password" class="m-err">{{ errors.password }}</span>
      </div>

      <div v-if="serverError" class="m-notice err"><i class="fas fa-circle-exclamation"></i><span>{{ serverError }}</span></div>

      <button type="submit" class="m-btn" :disabled="loading">
        <i v-if="loading" class="fas fa-spinner fa-spin"></i>
        {{ loading ? 'Creating…' : 'Create Account' }}
      </button>
    </form>

    <div class="m-or"><span>Or</span></div>
    <div class="m-social">
      <button type="button" @click="socialSoon('Google')" aria-label="Sign up with Google"><i class="fab fa-google"></i></button>
      <button type="button" @click="socialSoon('Apple')" aria-label="Sign up with Apple"><i class="fab fa-apple"></i></button>
    </div>
    <transition name="fade">
      <div v-if="socialToast" class="m-notice info m-toast"><i class="fas fa-circle-info"></i><span>{{ socialToast }} sign-up is coming soon! Use email for now.</span></div>
    </transition>

    <p class="m-switch">Already have an account?<router-link to="/login">Log in</router-link></p>
  </MobileAuthShell>

  <!-- ═══ DESKTOP LAYOUT ═══ -->
  <DesktopAuthShell v-else>
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
  </DesktopAuthShell>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { isLightMode } from '../theme'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import MobileAuthShell from '../components/mobile/MobileAuthShell.vue'
import DesktopAuthShell from '../components/desktop/DesktopAuthShell.vue'
import { useIsMobile } from '../composables/useIsMobile'

const isMobile = useIsMobile()
const socialToast = ref('')
function socialSoon(p){ socialToast.value = p; setTimeout(()=>{ socialToast.value='' }, 3500) }

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ username:'', email:'', password:'' })
const errors = reactive({ username:'', email:'', password:'' })
const loading = ref(false); const showPass = ref(false); const serverError = ref('')
// Reactive theme state — shared with the rest of the app (src/theme.js)
const isLight = isLightMode
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
    router.push('/verify-email') // Confirm the inbox before onboarding
  } catch(err){ serverError.value=err.response?.data?.error||'Registration failed.' }
  finally{loading.value=false}
}
</script>

<style scoped>
.auth-form-wrap { width: 100%; }
.auth-heading { font-size: 1.65rem; font-weight: 700; color: var(--text-1); margin-bottom: 5px; }
.auth-sub { font-size: 13px; color: var(--text-2); margin-bottom: 1.4rem; line-height: 1.5; }

.social-btns { display: flex; flex-direction: column; gap: 9px; margin-bottom: 1rem; }
.social-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 11px 16px; background: var(--bg-card); border: 1px solid var(--border-md); border-radius: var(--r-sm); color: var(--text-1); font-size: 13px; font-weight: 500; transition: background .2s, border-color .2s; }
.social-btn:hover { background: var(--bg-hover); border-color: var(--accent-solid); }
.fa-google { color: #ea4335; }

.divider { display: flex; align-items: center; gap: 10px; color: var(--text-3); font-size: 12px; margin-bottom: 1rem; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border-md); }

.field { margin-bottom: .8rem; }
.field-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-2); margin-bottom: 5px; }
.field-input { width: 100%; padding: 11px 14px; background: var(--bg-card); border: 1.5px solid var(--border-md); border-radius: var(--r-sm); color: var(--text-1); font-size: 13.5px; outline: none; transition: border-color .2s, box-shadow .2s; }
.field-input::placeholder { color: var(--text-3); }
.field-input:focus { border-color: var(--accent-solid); box-shadow: 0 0 0 3px rgba(109,40,217,.16); }
.field-input.error { border-color: var(--red); }
.field-error { font-size: 11.5px; color: var(--red); margin-top: 3px; display: block; }

.pass-wrap { position: relative; }
.pass-wrap .field-input { padding-right: 42px; }
.eye-btn { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); background: none; color: var(--text-2); font-size: 14px; padding: 4px; transition: color .2s; }

.strength-bar { height: 3px; background: var(--border-md); border-radius: 99px; margin-top: 5px; overflow: hidden; }
.strength-fill { height: 100%; border-radius: 99px; transition: width .4s, background .4s; }
.strength-txt { font-size: 11px; font-weight: 600; display: block; margin-top: 3px; }

.notice.err { background: rgba(242,139,130,.1); border: 1px solid rgba(242,139,130,.25); color: var(--red); padding: 9px 12px; border-radius: var(--r-sm); font-size: 12.5px; display: flex; align-items: center; gap: 7px; margin-bottom: .9rem; }

.submit-btn { width: 100%; padding: 12px; background: var(--accent-solid); border: none; border-radius: var(--r-sm); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity .2s, transform .15s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 1rem; }
.submit-btn:not(:disabled):hover { opacity: .92; }
.submit-btn:not(:disabled):active { transform: scale(.98); }
.submit-btn:disabled { opacity: .5; cursor: not-allowed; }

.switch-text { font-size: 13px; color: var(--text-2); text-align: center; }
.switch-text a { color: var(--purple); font-weight: 600; }
.switch-text a:hover { text-decoration: underline; }
</style>
