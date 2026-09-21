import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { auth as firebaseAuth, googleProvider } from '../firebase'
import { signInWithPopup } from 'firebase/auth'

/**
 * Authentication store — explicit state machine.
 *
 * status: 'loading' | 'authenticated' | 'unauthenticated'
 *   • resolved SYNCHRONOUSLY from localStorage on startup so the router
 *     guard never treats "not loaded yet" as "logged out" (race-condition fix)
 *   • validated in the background via /auth/me — an expired/invalid token
 *     transitions to 'unauthenticated' and the UI reacts without a page reload
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('kb_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('kb_user') || 'null'))

  // Optimistic initial status — synchronously derived, never blocking UI.
  // `init()` then verifies the session against the backend.
  const status = ref(token.value ? 'authenticated' : 'unauthenticated')
  const sessionExpired = ref(false)

  const isLoggedIn = computed(() => status.value === 'authenticated' && !!token.value)
  const needsOnboarding = computed(() => isLoggedIn.value && user.value && !user.value.onboarded)

  function persist() {
    if (token.value) localStorage.setItem('kb_token', token.value)
    if (user.value) localStorage.setItem('kb_user', JSON.stringify(user.value))
  }

  function applyAuth(data) {
    token.value = data.token
    user.value = data.user
    status.value = 'authenticated'
    sessionExpired.value = false
    persist()
  }

  function clear() {
    token.value = null
    user.value = null
    status.value = 'unauthenticated'
    localStorage.removeItem('kb_token')
    localStorage.removeItem('kb_user')
  }

  /* ── Session initialisation ────────────────────────────────────────
     Called once at app start. Validates the stored token against the
     backend WITHOUT blocking the first render (the optimistic status
     already let the router resolve). If the token turned out to be
     expired, sessionExpired() fires and the app reacts gracefully.   */
  let initPromise = null
  function init() {
    if (initPromise) return initPromise
    if (!token.value) {
      initPromise = Promise.resolve()
      return initPromise
    }
    initPromise = (async () => {
      try {
        const { data } = await api.get('/auth/me')
        user.value = data
        status.value = 'authenticated'
        localStorage.setItem('kb_user', JSON.stringify(data))
      } catch (err) {
        // 401 handled globally via kb:auth-expired event (api.js);
        // any other failure keeps the optimistic session (offline tolerance).
        if (!err.response) console.warn('[Auth] Profile check skipped (network):', err.message)
      }
    })()
    return initPromise
  }

  /* Fired by api.js when the backend rejects a previously stored token. */
  function handleAuthExpired() {
    if (!token.value && status.value !== 'authenticated') return
    clear()
    sessionExpired.value = true
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('kb:auth-expired', handleAuthExpired)
  }

  async function login(email, password, rememberMe = false) {
    const { data } = await api.post('/auth/login', { email, password, rememberMe })
    applyAuth(data)
    return data
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(firebaseAuth, googleProvider)
    const idToken = await result.user.getIdToken()
    const { data } = await api.post('/auth/google', { idToken })
    applyAuth(data)
    return data
  }

  async function register(username, email, password) {
    const { data } = await api.post('/auth/register', { username, email, password })
    applyAuth(data)
    return data
  }

  async function completeOnboarding(payload) {
    await api.post('/auth/onboarding', payload)
    if (user.value) {
      user.value = { ...user.value, onboarded: 1, profession: payload.profession }
      localStorage.setItem('kb_user', JSON.stringify(user.value))
    }
  }

  async function fetchProfile() {
    const { data } = await api.get('/auth/me')
    user.value = data
    localStorage.setItem('kb_user', JSON.stringify(data))
    return data
  }

  async function updateProfile(updates) {
    await api.put('/auth/profile', updates)
    user.value = { ...user.value, ...updates }
    localStorage.setItem('kb_user', JSON.stringify(user.value))
  }

  // Forgot password → sends OTP to email
  async function forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  }

  // Verify 6-digit OTP → get reset token
  async function verifyOtp(email, otp) {
    const { data } = await api.post('/auth/verify-otp', { email, otp })
    return data // { reset_token }
  }

  // Reset password with token
  async function resetPassword(token, password) {
    const { data } = await api.post('/auth/reset-password', { token, password })
    return data
  }

  /* Explicit user-initiated logout (vs. session expiry). */
  function logout() {
    sessionExpired.value = false
    clear()
  }

  return {
    token, user, status, isLoggedIn, needsOnboarding, sessionExpired,
    init, login, loginWithGoogle, register, completeOnboarding, fetchProfile, updateProfile,
    forgotPassword, verifyOtp, resetPassword, logout
  }
})
