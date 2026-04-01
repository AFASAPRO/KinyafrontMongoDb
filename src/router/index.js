import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  // Public landing page — shown to guests at /
  { path: '/',            component: () => import('../views/LandingView.vue'),          meta: { landingPage: true } },
  { path: '/login',       component: () => import('../views/LoginView.vue'),            meta: { guestOnly: true } },
  { path: '/register',    component: () => import('../views/RegisterView.vue'),         meta: { guestOnly: true } },
  { path: '/chat',        component: () => import('../views/ChatView.vue'),             meta: { requiresAuth: true } },
  { path: '/onboarding',  component: () => import('../views/OnboardingView.vue'),       meta: { requiresAuth: true } },
  { path: '/forgot-password', component: () => import('../views/ForgotPasswordView.vue'), meta: { guestOnly: true } },
  { path: '/reset-password',  component: () => import('../views/ResetPasswordView.vue'),  meta: { guestOnly: true } },
  { path: '/admin',           component: () => import('../views/admin/AdminLoginView.vue'),  meta: { adminGuest: true } },
  { path: '/admin/dashboard', component: () => import('../views/admin/AdminDashboard.vue'), meta: { requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const adminToken = localStorage.getItem('kb_admin_token')

  // Admin routes
  if (to.meta.requiresAdmin && !adminToken) return next('/admin')
  if (to.meta.adminGuest && adminToken) return next('/admin/dashboard')

  // Landing page: if already logged in, go to /chat
  if (to.meta.landingPage && auth.isLoggedIn) {
    if (!auth.user?.onboarded) return next('/onboarding')
    return next('/chat')
  }

  // Protected routes
  if (to.meta.requiresAuth && !auth.isLoggedIn) return next('/login')

  // Guest-only routes: logged in users go to chat
  if (to.meta.guestOnly && auth.isLoggedIn) {
    if (!auth.user?.onboarded) return next('/onboarding')
    return next('/chat')
  }

  // Redirect logged-in users who haven't onboarded
  if (auth.isLoggedIn && !auth.user?.onboarded && to.path !== '/onboarding') {
    return next('/onboarding')
  }

  next()
})

export default router
