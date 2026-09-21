import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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
  // Legacy deep links & the PWA "New Chat" shortcut still land here
  // (query — e.g. ?new=1 — is preserved through the redirect)
  { path: '/chat', redirect: (to) => ({ path: '/', query: to.query }) },
  { path: '/login',           component: () => import('../views/LoginView.vue'),            meta: { guestOnly: true } },
  { path: '/register',        component: () => import('../views/RegisterView.vue'),         meta: { guestOnly: true } },
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
    return auth.needsOnboarding ? '/onboarding' : '/'
  }

  // Fresh registrations must finish onboarding before anything else
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
