import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/**
 * LANDING + CHAT ROUTING
 * ─────────────────────────────────────────────────────────────────
 * The marketing landing page (static site, dist root — see
 * landing-dist/) is served at `/`. This Vue SPA is mounted under
 * `/chat/` (vite.config.js `base`) and owns everything below it:
 *
 *   • /chat/          : the KinyaBot chat interface — AUTHENTICATED
 *                       USERS ONLY. Guests are bounced back to the
 *                       landing page at `/` (full-page navigation,
 *                       because the landing lives outside this SPA's
 *                       /chat/ router base).
 *   • /chat/login, /chat/register … are guest-only and bounce
 *     authenticated users straight back to the chat.
 *   • The admin app (/chat/admin) stays fully separate.
 *
 * Signed-in visitors who open the domain root `/` are sent straight
 * to /chat/ by a tiny redirect script embedded in the landing page
 * (localStorage kb_token check), so members land in the app, while
 * everyone else sees the marketing site.
 */
const routes = [
  {
    path: '/',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  // First-run mobile intro (image-1 style "Get Started" screen). Guest-only;
  // reachable by direct link — first-time visitors now meet the marketing
  // landing page at `/` instead.
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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

/**
 * Send the browser to the marketing landing page. The landing site is
 * served from the domain root (`/`), OUTSIDE this SPA's `/chat/` base —
 * so this must be a full-page navigation, never a router push.
 */
function gotoLanding() {
  window.location.replace('/')
}

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

  // Protected routes (the chat UI itself, verify-email, onboarding):
  // unauthenticated visitors are bounced to the public landing page.
  if (to.meta.requiresAuth && !authed) {
    gotoLanding()
    return false
  }

  // Guest-only routes (login/register/reset): members go straight to chat
  if (to.meta.guestOnly && authed) {
    if (auth.needsEmailVerification) return '/verify-email'
    return auth.needsOnboarding ? '/onboarding' : '/'
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
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Failed to load module script') ||
    msg.includes('Loading chunk') && msg.includes('failed') ||
    error?.name === 'ChunkLoadError'

  if (isChunkError) {
    if (!sessionStorage.getItem('kb_chunk_reload')) {
      sessionStorage.setItem('kb_chunk_reload', '1')
      // to.fullPath is relative to the router base (/chat/) — re-add it
      const base = import.meta.env.BASE_URL.replace(/\/+$/, '')
      window.location.assign(base + (to?.fullPath || '/'))
    }
    return
  }
  console.error('[Router]', error)
})

export default router
