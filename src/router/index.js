import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { isMobileViewport, hasSeenIntro } from '../composables/useIsMobile'

/**
 * CHAT-FIRST ROUTING
 * ─────────────────────────────────────────────────────────────────
 * `/` IS the KinyaBot chat interface (the app itself — no landing page).
 *   • Guests  : full chat UI in read/explore mode + Sign In / Sign Up in
 *               the header. Sending a message triggers the auth gate.
 *   • Members : restored session, conversation history, normal chat.
 *
 * /login, /register … are guest-only and bounce authenticated users
 * straight back to the chat. The admin app (/admin) stays fully separate.
 */
const routes = [
  {
    path: '/',
    component: () => import('../views/ChatView.vue'),
    meta: { allowGuest: true }
  },
  { path: '/landing', component: () => import('../views/LandingView.vue'), meta: { allowGuest: true } },
  // Legacy deep links & the PWA "New Chat" shortcut still land here
  // (query — e.g. ?new=1 — is preserved through the redirect)
  { path: '/chat', redirect: (to) => ({ path: '/', query: to.query }) },
  // First-run mobile intro (image-1 style "Get Started" screen). Guest-only,
  // shown once per device — see the beforeEach guard below.
  { path: '/welcome',         component: () => import('../views/GetStartedView.vue'),       meta: { guestOnly: true } },
  { path: '/login',           component: () => import('../views/LoginView.vue'),            meta: { guestOnly: true } },
  { path: '/register',        component: () => import('../views/RegisterView.vue'),         meta: { guestOnly: true } },
  { path: '/verify-email',    component: () => import('../views/VerifyEmailView.vue'),       meta: { requiresAuth: true } },
  { path: '/onboarding',      component: () => import('../views/OnboardingView.vue'),       meta: { requiresAuth: true } },
  { path: '/forgot-password', component: () => import('../views/ForgotPasswordView.vue'),   meta: { guestOnly: true } },
  { path: '/reset-password',  component: () => import('../views/ResetPasswordView.vue'),    meta: { guestOnly: true } },
  { path: '/admin',           component: () => import('../views/admin/AdminLoginView.vue'), meta: { adminGuest: true } },
  { path: '/admin/dashboard', component: () => import('../views/admin/AdminDashboard.vue'), meta: { requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  /* ── Admin app: independent token & guard logic (unchanged) ── */
  if (to.meta.requiresAdmin || to.meta.adminGuest) {
    const adminToken = localStorage.getItem('kb_admin_token')
    if (to.meta.requiresAdmin && !adminToken) return '/admin'
    if (to.meta.adminGuest && adminToken) return '/admin/dashboard'
    return true
  }

  /* ── User app ──────────────────────────────────────────────────
     auth.status is resolved synchronously from storage, so this
     decision NEVER runs against an undefined auth state.         */
  const authed = auth.status === 'authenticated'

  // Protected routes: unauthenticated → login
  if (to.meta.requiresAuth && !authed) return '/login'

  // Guest-only routes (login/register/reset): members go straight to chat
  if (to.meta.guestOnly && authed) {
    if (auth.needsEmailVerification) return '/verify-email'
    return auth.needsOnboarding ? '/onboarding' : '/'
  }

  // First-time phone visitors land on the "Get Started" intro once, before
  // ever seeing the chat UI. Desktop is unaffected; returning/logged-in
  // visitors skip straight past it.
  if (to.path === '/' && !authed && isMobileViewport() && !hasSeenIntro()) {
    return '/welcome'
  }

  // Fresh registrations confirm their email, then finish onboarding —
  // in that order — before anything else in the app.
  if (authed && auth.needsEmailVerification) {
    return to.path !== '/verify-email' ? '/verify-email' : true
  }
  if (authed && auth.needsOnboarding && to.path !== '/onboarding') return '/onboarding'

  return true
})

/**
 * STALE-CHUNK RECOVERY (black-screen fix, part 1)
 * ─────────────────────────────────────────────────────────────────
 * After a redeploy, an open tab / PWA can hold HTML that references
 * hashed chunks which no longer exist. The dynamic import of a lazy
 * route then fails and — with the out-in page transition — the screen
 * would stay empty (black). We detect the failure and reload once
 * with fresh assets; the sessionStorage flag prevents reload loops.
 */
router.onError((error, to) => {
  const msg = String(error?.message || '')
  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')

  if (isChunkError) {
    if (!sessionStorage.getItem('kb_chunk_reload')) {
      sessionStorage.setItem('kb_chunk_reload', '1')
      window.location.assign(to?.fullPath || '/')
    }
    return
  }
  console.error('[Router]', error)
})

export default router
