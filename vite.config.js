import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { existsSync, mkdirSync, renameSync, cpSync, readFileSync, writeFileSync, rmSync, readdirSync, lstatSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * kb-merge-landing-dist
 * ─────────────────────────────────────────────────────────────────────────
 * Assembles the final deployment layout at the END of every `vite build`:
 *
 *   dist/                ← marketing landing page (static clone: landing-dist/)
 *   ├── index.html         • pre-rendered landing HTML (+ injected auth redirect)
 *   ├── assets/…           • landing JS/CSS chunks
 *   ├── media/…            • landing videos/images (self-hosted)
 *   ├── robots.txt, sitemap.xml, google verification, sw-kill.js
 *   └── chat/            ← the KinyaBot chat SPA (Vue, base /chat/)
 *       ├── index.html
 *       ├── assets/…
 *       └── (icons, manifests, sw.js, rive/, models/)
 *
 * Vercel (see vercel.json):
 *   /              → landing (static files at dist root)
 *   /chat/(.*)     → /chat/index.html (Vue SPA fallback)
 *   /sw.js         → /chat/sw-kill.js (unregisters legacy root-scope SW)
 *
 * Doing the merge INSIDE the vite build (instead of a separate npm script)
 * guarantees the layout is correct no matter which build command the host
 * runs — `npm run build`, plain `vite build`, anything.
 */
function kbMergeLandingDist() {
  let outDirAbs = null
  return {
    name: 'kb-merge-landing-dist',
    apply: 'build',
    configResolved(config) {
      outDirAbs = resolvePath(config.root, config.build.outDir || 'dist')
    },
    closeBundle() {
      const frontend = resolvePath(outDirAbs, '..')
      const landingDist = join(frontend, 'landing-dist')

      if (!existsSync(join(outDirAbs, 'index.html'))) {
        throw new Error(`[kb-merge] vite output not found at ${outDirAbs} — build failed?`)
      }
      if (!existsSync(landingDist)) {
        throw new Error(
          '[kb-merge] landing-dist/ is missing — the static landing build must live next to the frontend sources.'
        )
      }

      // 1. Move the freshly built chat SPA into <outDir>/chat/
      const chatDir = join(outDirAbs, 'chat')
      rmSync(chatDir, { recursive: true, force: true })
      mkdirSync(chatDir, { recursive: true })
      for (const entry of readdirSync(outDirAbs)) {
        if (entry === 'chat') continue
        const src = join(outDirAbs, entry)
        const st = lstatSync(src)
        if (st.isDirectory()) {
          cpSync(src, join(chatDir, entry), { recursive: true })
          rmSync(src, { recursive: true, force: true })
        } else {
          renameSync(src, join(chatDir, entry))
        }
      }

      // 2. Copy the static landing site to the dist root
      cpSync(landingDist, outDirAbs, { recursive: true })

      // 3. Inject into the landing HTML (idempotent):
      //    • signed-in visitors (localStorage kb_token) → straight to /chat/
      //    • unregister any LEGACY service worker still registered at the
      //      domain root ('/') by the previous deployment (its scope would
      //      otherwise keep hijacking navigations to the old app shell)
      const marker = 'data-kb-auth-redirect'
      // Readable form — injected verbatim (newlines inside <script> are fine).
      const redirectBody = `try {
  if (localStorage.getItem('kb_token')) {
    var u = new URL(location.href)
    if (u.searchParams.get('source') !== 'pwa') { location.replace('/chat/') }
  }
} catch (e) {}
try {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (rs) {
      rs.forEach(function (r) {
        try { if (r.scope === location.origin + '/') { r.unregister() } } catch (e) {}
      })
    })
  }
} catch (e) {}`
      // Build-time guard: refuse to ship a syntactically broken snippet.
      new Function(redirectBody)
      const inject = `<script ${marker}>${redirectBody}</script>`
      const landingHtmlPath = join(outDirAbs, 'index.html')
      let html = readFileSync(landingHtmlPath, 'utf8')
      if (!html.includes(marker)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n    ${inject}`)
        writeFileSync(landingHtmlPath, html)
      }

      console.log('[kb-merge] dist assembled → landing at root, chat SPA at /chat/, sw-kill at /sw.js')
    }
  }
}

export default defineConfig({
  plugins: [vue(), kbMergeLandingDist()],
  // The chat SPA is mounted under /chat/ — the domain root (/) serves the
  // static marketing landing page (see landing-dist/ + the kb-merge plugin).
  base: '/chat/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true, secure: false },
      // Socket.IO (Superadmin realtime) — ws:true so the dev server
      // proxies websocket upgrades to the backend as well.
      '/socket.io': { target: 'http://localhost:5000', changeOrigin: true, ws: true, secure: false }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libraries so app code updates don't
        // re-download the whole dependency graph (faster PWA updates)
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-markdown': ['marked', 'highlight.js'],
          'vendor-socket': ['socket.io-client'],
          'vendor-axios': ['axios'],
          'vendor-three': ['three']
        }
      }
    }
  }
})
