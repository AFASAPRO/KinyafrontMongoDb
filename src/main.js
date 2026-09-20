import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/global.css'
import { initViewportShim } from './utils/viewport'

// Keyboard / visual-viewport shim (keeps the mobile composer above the keyboard)
initViewportShim()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

/**
 * Route-aware PWA manifest:
 *  • /admin…  → KinyaBot Admin manifest (installs as "KB Admin", starts at /admin)
 *  • any other route → KinyaBot user manifest (installs as "KinyaBot", starts at /)
 * The swap must happen before the browser reads the manifest for an install
 * prompt, so it runs in the router's afterEach hook.
 */
const MANIFESTS = {
  admin: '/admin-manifest.webmanifest',
  user: '/site.webmanifest'
}
const manifestLink = document.querySelector('link[rel="manifest"]')
const themeMeta = document.querySelector('meta[name="theme-color"]')
const appleTouch = document.querySelector('link[rel="apple-touch-icon"]')

function applyManifestForPath(path) {
  if (!manifestLink) return
  const isAdmin = path === '/admin' || path.startsWith('/admin/')
  const target = isAdmin ? MANIFESTS.admin : MANIFESTS.user
  if (manifestLink.getAttribute('href') !== target) {
    manifestLink.setAttribute('href', target)
    if (themeMeta) themeMeta.setAttribute('content', isAdmin ? '#4f46e5' : '#131314')
    if (appleTouch) appleTouch.setAttribute('href', isAdmin ? '/admin-icon-192.png' : '/apple-touch-icon.png')
  }
}
applyManifestForPath(window.location.pathname)
router.afterEach((to) => applyManifestForPath(to.path))

/**
 * Service Worker (production only — keeps Vite HMR/dev server untouched).
 * The SW provides app-shell offline support; /api, /socket.io and /uploads
 * are never cached (see public/sw.js).
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service worker registration failed:', err)
    })
  })
}
