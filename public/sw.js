/**
 * KinyaBot Service Worker
 * ─────────────────────────────────────────────────────────────
 * Strategy:
 *  • Precache the app shell (SPA entry + branding) so the installed
 *    PWA boots offline and route refreshes never blank out.
 *  • Navigations: network-first, fall back to the cached shell
 *    (keeps /login, /, /admin/... working inside the PWA).
 *  • App code (JS/CSS bundles): NETWORK-FIRST with cache fallback —
 *    after a redeploy clients immediately get the new bundle instead
 *    of a stale one that references deleted hashed chunks (the old
 *    stale-while-revalidate behavior caused blank/black screens).
 *  • Other static assets (images, fonts): stale-while-revalidate.
 *  • Cross-origin CDN libs (font-awesome, highlight.js, fonts): cache-first
 *    (immutable, versioned URLs).
 *  • NEVER cache dynamic / private data: /api/*, /socket.io/*, /uploads/*
 *    always go straight to the network (auth, AI conversations, admin data).
 */

const VERSION = 'v2.0.0'
const SHELL_CACHE = `kb-shell-${VERSION}`
const ASSET_CACHE = `kb-assets-${VERSION}`
const CDN_CACHE = `kb-cdn-${VERSION}`

const SHELL_ASSETS = [
  '/',
  '/site.webmanifest',
  '/admin-manifest.webmanifest',
  '/logo.png',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/admin-icon-192.png',
  '/admin-icon-512.png'
]

/* Endpoints that must NEVER be served from cache */
const NEVER_CACHE = [
  /\/api\//,
  /\/socket\.io\//,
  /\/uploads\//
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, CDN_CACHE].includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// Allow the page to trigger an immediate update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

function isNeverCache(url) {
  return NEVER_CACHE.some((re) => re.test(url.pathname))
}

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Only handle safe read-only requests
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Dynamic / authenticated data → always network, no cache
  if (isNeverCache(url)) return

  // Vite dev/HMR — let the dev server handle everything
  if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/src/')) return

  // App navigation (HTML documents): network-first, shell fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => {})
          return res
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('/'))
        )
    )
    return
  }

  // Cross-origin CDN (cdnjs / google fonts): cache-first (versioned, immutable)
  if (url.origin !== self.location.origin) {
    if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
      event.respondWith(
        caches.open(CDN_CACHE).then(async (cache) => {
          const hit = await cache.match(req)
          if (hit) return hit
          try {
            const res = await fetch(req)
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone())
            return res
          } catch {
            return hit || Response.error()
          }
        })
      )
    }
    return // everything else: untouched
  }

  // Same-origin static assets
  //  • App code (.js/.css): network-first → a deploy takes effect on the
  //    next load; the cache covers offline / network failures.
  //  • Everything else (images, manifests, fonts): stale-while-revalidate.
  const isAppCode = /\.(js|css)(\?.*)?$/.test(url.pathname)
  if (isAppCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).catch(() => {})
          }
          return res
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || Response.error())
        )
    )
    return
  }

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const hit = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => hit)
      return hit || network
    })
  )
})
