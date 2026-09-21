import axios from 'axios'

// In dev: Vite proxy (/api → http://localhost:5000/api)
// In prod: full URL from .env
const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('kb_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * 401 handling — SPA-friendly session expiry.
 * Instead of a hard `window.location.href = '/login'` reload (which
 * destroyed in-memory state and made auth transitions feel broken),
 * we clear the stored session and emit an event. The auth store and
 * App.vue react instantly: status → 'unauthenticated', header swaps to
 * Sign In / Sign Up, protected routes redirect — all without a reload.
 */
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isAdminRoute = err.config?.url?.includes('/admin/')
      const isAuthEndpoint = err.config?.url?.includes('/auth/login') ||
                             err.config?.url?.includes('/auth/register') ||
                             err.config?.url?.includes('/auth/google')
      if (!isAdminRoute && !isAuthEndpoint) {
        localStorage.removeItem('kb_token')
        localStorage.removeItem('kb_user')
        window.dispatchEvent(new CustomEvent('kb:auth-expired'))
      }
    }
    return Promise.reject(err)
  }
)

export default api
