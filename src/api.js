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

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isAdminRoute = err.config?.url?.includes('/admin/')
      if (!isAdminRoute) {
        localStorage.removeItem('kb_token')
        localStorage.removeItem('kb_user')
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
