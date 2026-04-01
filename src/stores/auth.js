import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { auth as firebaseAuth, googleProvider } from '../firebase'
import { signInWithPopup } from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('kb_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('kb_user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const needsOnboarding = computed(() => isLoggedIn.value && user.value && !user.value.onboarded)

  async function login(email, password, rememberMe = false) {
    const { data } = await api.post('/auth/login', { email, password, rememberMe })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('kb_token', data.token)
    localStorage.setItem('kb_user', JSON.stringify(data.user))
    return data
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(firebaseAuth, googleProvider)
    const idToken = await result.user.getIdToken()
    const { data } = await api.post('/auth/google', { idToken })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('kb_token', data.token)
    localStorage.setItem('kb_user', JSON.stringify(data.user))
    return data
  }

  async function register(username, email, password) {
    const { data } = await api.post('/auth/register', { username, email, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('kb_token', data.token)
    localStorage.setItem('kb_user', JSON.stringify(data.user))
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

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('kb_token')
    localStorage.removeItem('kb_user')
  }

  return {
    token, user, isLoggedIn, needsOnboarding,
    login, loginWithGoogle, register, completeOnboarding, fetchProfile, updateProfile,
    forgotPassword, verifyOtp, resetPassword, logout
  }
})
