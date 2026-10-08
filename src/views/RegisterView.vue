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
      <button type="button" @click="handleGoogleRegister" :disabled="loading" aria-label="Sign up with Google"><i :class="loading ? 'fas fa-spinner fa-spin' : 'fab fa-google'"></i></button>
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
        <div class="auth-kicker"><span></span> KINYABOT ACCOUNT</div>
        <h1 class="auth-heading">Create account </h1>
        <p class="auth-sub">Join KinyaBot and start your AI journey today.</p>
        <form @submit.prevent="handleRegister" novalidate>
          <div class="social-btns">
            <button type="button" class="social-btn" @click="handleGoogleRegister" :disabled="loading">
              <i :class="loading ? 'fas fa-spinner fa-spin' : 'fab fa-google'"></i><span>{{ loading ? 'Connecting…' : 'Sign up with Google' }}</span>
            </button>
            <button type="button" class="social-btn"><i class="fab fa-apple"></i><span>Sign up with Apple</span></button>
          </div>
          <div class="divider"><span>OR</span></div>
          <div class="field">
            <label class="field-label" for="register-username">Username</label>
            <div class="field-input-wrap">
              <i class="field-icon fas fa-user" aria-hidden="true"></i>
              <input id="register-username" v-model="form.username" type="text" class="field-input" :class="{error:errors.username}" placeholder="Choose a username" autocomplete="username" />
            </div>
            <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
          </div>
          <div class="field">
            <label class="field-label" for="register-email">Email address</label>
            <div class="field-input-wrap">
              <i class="field-icon fas fa-envelope" aria-hidden="true"></i>
              <input id="register-email" v-model="form.email" type="email" class="field-input" :class="{error:errors.email}" placeholder="name@example.com" autocomplete="email" />
            </div>
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          </div>
          <div class="field">
            <label class="field-label" for="register-password">Password</label>
            <div class="pass-wrap">
              <i class="field-icon fas fa-lock" aria-hidden="true"></i>
              <input id="register-password" v-model="form.password" :type="showPass?'text':'password'" class="field-input" :class="{error:errors.password}" placeholder="Create a password" autocomplete="new-password" />
              <button type="button" class="eye-btn" @click="showPass=!showPass" :aria-label="showPass?'Hide password':'Show password'"><i :class="showPass?'far fa-eye-slash':'far fa-eye'"></i></button>
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
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import MobileAuthShell from '../components/mobile/MobileAuthShell.vue'
import DesktopAuthShell from '../components/desktop/DesktopAuthShell.vue'
import { useIsMobile } from '../composables/useIsMobile'
import { googleErrorMessage } from '../utils/googleAuthErrors'

const isMobile = useIsMobile()
const socialToast = ref('')
function socialSoon(p){ socialToast.value = p; setTimeout(()=>{ socialToast.value='' }, 3500) }

const router = useRouter()
const auth = useAuthStore()
function rememberAuthMethod(method) {
  try { localStorage.setItem('kb_last_auth_method', method) } catch (err) {
    console.warn('[Register] Could not remember the last sign-in method:', err)
  }
}
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
  const color=s<40?'#f28b82':s<70?'#fbbc04':'var(--success)'
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
    rememberAuthMethod('email')
    router.push('/onboarding')
  } catch(err){ serverError.value=err.response?.data?.error||'Registration failed.' }
  finally{loading.value=false}
}
function handleGoogleRegister() {
  if (loading.value) return            // prevent duplicate clicks
  serverError.value = ''; loading.value = true
  // Full-page redirect: backend → Google → backend → back to /chat/auth/google/callback
  auth.startGoogleLogin({ from: 'register' })
}

// Google sent the user back with an error (cancelled, expired, …)
const route = useRoute()
if (typeof route.query.google_error === 'string') {
  serverError.value = googleErrorMessage(route.query.google_error)
  router.replace({ path: route.path, query: { ...route.query, google_error: undefined } })
}
// Back/forward cache: returning from Google's page must not leave the button spinning
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (e) => { if (e.persisted) loading.value = false })
}
</script>

<style scoped>
.auth-form-wrap { width: 100%; }
.auth-kicker { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 10px; font-weight: 700; letter-spacing: .12em; margin-bottom: 12px; }
.auth-kicker span { width: 7px; height: 7px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 4px rgba(52,168,83,.13); }
.auth-heading { font-family: var(--font); font-size: 1.9rem; line-height: 1.1; font-weight: 600; letter-spacing: -.02em; color: var(--text-1); margin-bottom: 7px; }
.auth-sub { font-size: 13.5px; color: var(--text-2); margin-bottom: 1.1rem; line-height: 1.5; }
.social-btns { display: flex; flex-direction: column; gap: 9px; margin-bottom: 1rem; }
.social-btn { min-height: 43px; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 9px 16px; background: var(--bg-card); border: 1px solid var(--border-md); border-radius: 9px; color: var(--text-1); font-size: 13px; font-weight: 600; transition: background .18s, border-color .18s, transform .18s; }
.social-btn:hover { background: var(--bg-hover); border-color: var(--text-3); transform: translateY(-1px); }
.social-btn:focus-visible, .submit-btn:focus-visible, .eye-btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent-solid) 35%, transparent); outline-offset: 2px; }
.social-btn:disabled { opacity: .65; cursor: wait; transform: none; }
.fa-google { color: #ea4335; font-size: 15px; }
.fa-apple { font-size: 16px; }
.divider { display: flex; align-items: center; gap: 12px; color: var(--text-3); font-size: 10px; font-weight: 700; letter-spacing: .1em; margin-bottom: .9rem; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border-md); }
.field { margin-bottom: .75rem; }
.field-label { display: block; font-size: 11.5px; font-weight: 650; color: var(--text-1); margin-bottom: 5px; }
.field-input-wrap, .pass-wrap { position: relative; }
.field-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); z-index: 1; color: var(--text-3); font-size: 13px; pointer-events: none; transition: color .18s; }
.field-input-wrap:focus-within .field-icon, .pass-wrap:focus-within .field-icon { color: var(--purple); }
.field-input { width: 100%; height: 43px; padding: 0 13px 0 40px; background: var(--bg-card); border: 1px solid var(--border-md); border-radius: 8px; color: var(--text-1); font-size: 13px; outline: none; transition: border-color .18s, box-shadow .18s, background .18s; }
.field-input::placeholder { color: var(--text-3); }
.field-input:hover { border-color: var(--text-3); }
.field-input:focus { background: var(--bg-base); border-color: var(--accent-solid); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid) 16%, transparent); }
.field-input.error { border-color: var(--red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 12%, transparent); }
.field-error { font-size: 11px; color: var(--red); margin-top: 4px; display: block; }
.pass-wrap .field-input { padding-right: 43px; }
.eye-btn { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 6px; background: transparent; color: var(--text-2); font-size: 13px; display: grid; place-items: center; transition: color .18s, background .18s; }
.eye-btn:hover { color: var(--text-1); background: var(--bg-hover); }
.strength-bar { height: 4px; background: var(--border-md); border-radius: 99px; margin-top: 6px; overflow: hidden; }
.strength-fill { height: 100%; border-radius: 99px; transition: width .35s, background .35s; }
.strength-txt { font-size: 10px; font-weight: 650; display: block; margin-top: 3px; }
.notice.err { background: color-mix(in srgb, var(--red) 10%, transparent); border: 1px solid color-mix(in srgb, var(--red) 26%, transparent); color: var(--red); padding: 9px 11px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; gap: 8px; margin-bottom: .75rem; }
.submit-btn { width: 100%; min-height: 45px; padding: 11px 14px; background: var(--accent-solid); border: 1px solid transparent; border-radius: 8px; color: var(--on-accent); font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background .18s, transform .18s, box-shadow .18s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: .8rem; box-shadow: 0 5px 14px color-mix(in srgb, var(--accent-solid) 22%, transparent); }
.submit-btn:not(:disabled):hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 8px 18px color-mix(in srgb, var(--accent-solid) 30%, transparent); }
.submit-btn:not(:disabled):active { transform: translateY(0); }
.submit-btn:disabled { opacity: .62; cursor: wait; box-shadow: none; }
.switch-text { font-size: 12.5px; color: var(--text-2); text-align: center; }
.switch-text a { color: var(--purple); font-weight: 700; text-decoration: none; }
.switch-text a:hover { text-decoration: underline; }
@media (max-height: 820px) and (min-width: 1181px) { .das-left { padding-top: 1.25rem; padding-bottom: 1.25rem; } .auth-heading { font-size: 1.7rem; } }
</style>
