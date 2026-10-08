<template>
  <div class="gcb">
    <div class="gcb-card" role="status" aria-live="polite">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Signing you in with Google…</p>
    </div>
  </div>
</template>

<script setup>
/**
 * Landing page of the Google OAuth flow. The backend redirects here with a
 * single-use `?code=`; we swap it for the normal KinyaBot session and then
 * continue exactly like a regular login (onboarding or chat).
 */
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { googleErrorMessage } from '../utils/googleAuthErrors'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

function backToLogin(code) {
  router.replace({ path: '/login', query: { google_error: code } })
}

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//')
    ? route.query.redirect : '/'
  if (!code) return backToLogin('state_invalid')
  try {
    const result = await auth.completeGoogleLogin(code)
    try { localStorage.setItem('kb_last_auth_method', 'google') } catch { /* storage may be unavailable */ }
    // Drop the one-time code from the URL/history immediately
    router.replace(result.user.onboarded ? redirect : '/onboarding')
  } catch (err) {
    console.warn('[Google] sign-in could not be completed:', googleErrorMessage('code_expired'))
    backToLogin('code_expired')
  }
})
</script>

<style scoped>
.gcb { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: var(--bg, #131314); color: var(--text-1, #e3e3e3); }
.gcb-card { display: flex; flex-direction: column; align-items: center; gap: 14px; font-size: 14px; color: var(--text-2, #9aa0a6); }
.gcb-card i { font-size: 26px; color: var(--accent-solid, #4f46e5); }
</style>
