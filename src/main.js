import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/global.css'
import './assets/mobile.css'
import { initViewportShim } from './utils/viewport'

// Keyboard / visual-viewport shim (keeps the mobile composer above the keyboard)
initViewportShim()

// Safety net: this SPA must only ever run under its base path (/chat/ in
// production — the domain root serves the marketing landing page). If the
// app somehow boots outside its base (e.g. a stale service worker or an
// old cached index.html resurrected at '/'), jump to the canonical app URL
// instead of hanging on the boot splash forever.
//
// EXCEPTION — /admin: the admin console has a friendly URL alias at the
// domain root (vercel.json rewrites /admin → /chat/index.html). Vue Router
// resolves a pathname outside the base as-is, so /admin boots straight
// into the admin login flow. Never bounce those boots to /chat/.
const bootPath = window.location.pathname
const isAdminAliasPath = /^\/admin(\/|$)/.test(bootPath)
if (
  import.meta.env.PROD &&
  !bootPath.startsWith(import.meta.env.BASE_URL) &&
  !isAdminAliasPath
) {
  window.location.replace(import.meta.env.BASE_URL)
  throw new Error('[KinyaBot] SPA booted outside its base — redirecting to ' + import.meta.env.BASE_URL)
}

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
const BASE = import.meta.env.BASE_URL // '/chat/' in production, '/' in dev
const MANIFESTS = {
  admin: `${BASE}admin-manifest.webmanifest`,
  user: `${BASE}site.webmanifest`
}
const manifestLink = document.querySelector('link[rel="manifest"]')
const themeMeta = document.querySelector('meta[name="theme-color"]')
const appleTouch = document.querySelector('link[rel="apple-touch-icon"]')

function applyManifestForPath(path) {
  if (!manifestLink) return
  // to.path is relative to the router base, so '/admin' == URL '/chat/admin'
  const isAdmin = path === '/admin' || path.startsWith('/admin/')
  const target = isAdmin ? MANIFESTS.admin : MANIFESTS.user
  if (manifestLink.getAttribute('href') !== target) {
    manifestLink.setAttribute('href', target)
    if (themeMeta) themeMeta.setAttribute('content', isAdmin ? '#4f46e5' : '#070A12')
    if (appleTouch) appleTouch.setAttribute('href', isAdmin ? `${BASE}admin-icon-192.png` : `${BASE}apple-touch-icon.png`)
  }
}
applyManifestForPath(window.location.pathname)
router.afterEach((to) => {
  applyManifestForPath(to.path)
  sessionStorage.removeItem('kb_chunk_reload')
})

/**
 * Service Worker (production only — keeps Vite HMR/dev server untouched).
 * The SW provides app-shell offline support; /api, /socket.io and /uploads
 * are never cached (see public/sw.js).
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registered under /chat/ — the SW scope covers the chat app only
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
      console.warn('[PWA] Service worker registration failed:', err)
    })
  })
}
