/**
 * KinyaBot Superadmin — API layer
 * ─────────────────────────────────────────────────────────────────
 * Single axios instance for the Superadmin app. Handles:
 *   • admin token injection
 *   • session expiry (401/403 → silent logout + event)
 *   • consistent error normalization for views
 */
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'kb_admin_token'
const ADMIN_KEY = 'kb_admin'

export function getToken() { return localStorage.getItem(TOKEN_KEY) || '' }
export function getAdmin() {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null') } catch { return null }
}
export function setSession(token, admin) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
  window.dispatchEvent(new CustomEvent('kb_admin:logout'))
}

const api = axios.create({ baseURL: API, timeout: 60000, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    // Session expiry — every Superadmin route requires a live token.
    if (err.response?.status === 401 || err.response?.status === 403) {
      if (!err.config?.url?.includes('/admin/login')) {
        clearSession()
      }
    }
    return Promise.reject(err)
  }
)

/** Normalize an axios error into { status, message, code } for views. */
export function apiError(err) {
  if (err?.response) {
    return {
      status: err.response.status,
      message: err.response.data?.error || `Request failed (${err.response.status})`,
      code: err.response.data?.code || null,
    }
  }
  if (err?.code === 'ECONNABORTED') return { status: 0, message: 'The request timed out. Please try again.', code: 'TIMEOUT' }
  return { status: 0, message: 'Network error — could not reach the KinyaBot backend.', code: 'NETWORK' }
}

/** Authenticated file download (CSV exports) via blob — window.open
 *  cannot send the Authorization header, so exports use fetch. */
export async function downloadFile(path, filename) {
  try {
    const res = await api.get(path, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return true
  } catch { return false }
}

/** Resolve an uploads URL through the authenticated files endpoint. */
export function fileUrl(name) {
  return `${API}/files/${encodeURIComponent(name)}`
}

export default api
