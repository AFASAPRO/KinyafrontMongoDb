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
 *   • The admin app (/chat/admin) stays fully separate and is ALSO
 *     reachable via the friendly domain-root alias /admin (see the
 *     /admin rewrites in vercel.json).
 *
 * Signed-in visitors who open the domain root `/` are sent straight
 * to /chat/ by a tiny redirect script embedded in the landing page
 * (localStorage kb_token check), so members land in the app, while
 * everyone else sees the marketing site.
 *
 * INSTALLED APP (PWA) EXCEPTION: inside the standalone app window we
 * never bounce the user out to the marketing site. An unauthenticated
 * member opening the installed KinyaBot app is taken to the USER LOGIN
 * page (/login → URL /chat/login) so the app always opens on sign-in.
 */
const routes = [
  {
    path: '/',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  /* ═══ CONVERSATION ROUTE (§1) ═══
     Every conversation has a unique, collision-resistant id (UUID v4)
     addressed as /chat/c/{conversationId} in production (the SPA is
     mounted under the /chat/ base — see vite.config.js). Deep links,
     refresh, back/forward and "open in new tab" all resolve here; the
     Vercel rewrite /chat/(.*) → /chat/index.html serves the SPA.   */
  {
    path: '/c/:conversationId',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  // First-run mobile intro (image-1 style "Get Started" screen). Guest-only;
  // reachable by direct link — first-time visitors now meet the marketing
  // landing page at `/` instead.
  { path: '/welcome',         component: () => import('../views/GetStartedView.vue'),       meta: { guestOnly: true } },
  { path: '/login',           component: () => import('../views/LoginView.vue'),            meta: { guestOnly: true } },
  { path: '/register',        component: () => import('../views/RegisterView.vue'),         meta: { guestOnly: true } },
  { path: '/verify-email',    redirect: '/onboarding' },
  { path: '/onboarding',      component: () => import('../views/OnboardingView.vue'),       meta: { requiresAuth: true } },
  { path: '/forgot-password', component: () => import('../views/ForgotPasswordView.vue'),   meta: { guestOnly: true } },
  { path: '/reset-password',  component: () => import('../views/ResetPasswordView.vue'),    meta: { guestOnly: true } },

  /* ═══ PLANS & SUBSCRIPTION (user-facing) ═══
     /plans            : Plans & Usage page — current plan, live usage,
                         comparison, upgrade options, request history
     /plans/request    : upgrade request form (?plan=plus|pro preselected) */
  { path: '/plans',         component: () => import('../views/SubscriptionView.vue'),    meta: { requiresAuth: true } },
  { path: '/plans/request', component: () => import('../views/UpgradeRequestView.vue'),  meta: { requiresAuth: true } },

  /* ═══ SUPERADMIN CONSOLE (single administrative role: superadmin) ═══
     Routed app shell — every page lives under /admin/… so push
     notifications can deep-link straight to the right view.        */
  { path: '/admin',           component: () => import('../views/admin/AdminLoginView.vue'), meta: { adminGuest: true } },
  {
    path: '/admin',
    component: () => import('../admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '', redirect: { name: 'admin-dashboard' } },
      { path: 'dashboard',     name: 'admin-dashboard', component: () => import('../admin/views/DashboardView.vue') },
      { path: 'analytics',     name: 'admin-analytics', component: () => import('../admin/views/AnalyticsView.vue') },
      { path: 'users',         name: 'admin-users',     component: () => import('../admin/views/UsersView.vue') },
      { path: 'plan-requests', name: 'admin-plan-requests', component: () => import('../admin/views/PlanRequestsView.vue') },
      { path: 'chats',         name: 'admin-chats',     component: () => import('../admin/views/ChatsView.vue') },
      { path: 'knowledge',     name: 'admin-knowledge', component: () => import('../admin/views/KnowledgeView.vue') },
      { path: 'files',         name: 'admin-files',     component: () => import('../admin/views/FilesView.vue') },
      { path: 'moderation',    name: 'admin-moderation',component: () => import('../admin/views/ModerationView.vue') },
      { path: 'notifications', name: 'admin-alerts',    component: () => import('../admin/views/NotificationsView.vue') },
      { path: 'ai',            name: 'admin-ai',        component: () => import('../admin/views/AIControlView.vue') },
      { path: 'websearch',     name: 'admin-websearch', component: () => import('../admin/views/WebSearchView.vue') },
      { path: 'ai-testing',    name: 'admin-ai-test',   component: () => import('../admin/views/AITestingView.vue') },
      { path: 'health',        name: 'admin-health',    component: () => import('../admin/views/HealthView.vue') },
      { path: 'usage',         name: 'admin-usage',     component: () => import('../admin/views/UsageView.vue') },
      { path: 'security',      name: 'admin-security',  component: () => import('../admin/views/SecurityView.vue') },
      { path: 'audit',         name: 'admin-audit',     component: () => import('../admin/views/AuditView.vue') },
      { path: 'settings',      name: 'admin-settings',  component: () => import('../admin/views/SettingsView.vue') },
    ]
  },
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

/**
 * True when the SPA is running inside an INSTALLED app window (PWA
 * standalone display mode) or was explicitly opened with the PWA start
 * URL (site.webmanifest start_url is /chat/?source=pwa). Users in this
 * context must stay inside the app shell — never shipped out to the
 * marketing landing page.
 */
function isPwaContext() {
  try {
    if (new URLSearchParams(window.location.search).get('source') === 'pwa') return true
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true
    if (window.navigator && window.navigator.standalone === true) return true // iOS Safari
  } catch (e) { /* older browsers: fall through */ }
  return false
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

  // Protected routes (the chat UI itself and onboarding):
  // unauthenticated visitors are bounced to the public landing page —
  // EXCEPT inside the installed app (PWA), where they stay in the app
  // and land on the user login screen instead.
  if (to.meta.requiresAuth && !authed) {
    if (isPwaContext()) return '/login'
    gotoLanding()
    return false
  }

  // Guest-only routes (login/register/reset): members go straight to chat
  if (to.meta.guestOnly && authed) {
    return auth.needsOnboarding ? '/onboarding' : '/'
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
