/*
 * Legacy service-worker cleanup — served at /sw.js (see vercel.json rewrite).
 *
 * The PREVIOUS KinyaBot deployment registered a service worker at the domain
 * root (navigator.serviceWorker.register('/sw.js') → scope '/'). Browsers
 * keep that worker alive until it is replaced or unregistered, so returning
 * visitors could keep getting the old cached app shell instead of the new
 * landing page.
 *
 * This tiny worker exists only to migrate those browsers:
 *   1. purge every cache the old worker created
 *   2. unregister itself (the real chat SW lives at /chat/sw.js, scope /chat/)
 *   3. reload any open tabs so they pick up the fresh site from the network
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch (e) { /* ignore */ }
    try {
      await self.registration.unregister()
    } catch (e) { /* ignore */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        try { await client.navigate(client.url) } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  })())
})
