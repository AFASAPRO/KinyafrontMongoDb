/**
 * merge-dist.mjs — OPTIONAL fallback assembler (normally not needed!)
 * ─────────────────────────────────────────────────────────────────────
 * Since v2.1.1 the merge runs INSIDE `vite build` itself (see the
 * kb-merge-landing-dist plugin in vite.config.js), so a plain
 * `vite build` already produces the final deployment layout:
 *
 *   dist/                ← marketing landing page (static clone, landing-dist/)
 *   ├── index.html         • pre-rendered landing HTML (+ injected auth redirect)
 *   ├── assets/…           • landing JS/CSS chunks
 *   ├── media/…            • landing videos/images (self-hosted)
 *   ├── robots.txt, sitemap.xml, google verification, sw-kill.js
 *   └── chat/            ← the KinyaBot chat SPA (Vue, vite build --base /chat/)
 *
 * This script is kept only for edge cases where the vite plugin did not
 * run. It detects an already-merged dist and exits without touching it.
 */
import { existsSync, mkdirSync, renameSync, cpSync, readFileSync, writeFileSync, rmSync, readdirSync, lstatSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const frontend = join(root, '..')
const dist = join(frontend, 'dist')
const landingDist = join(frontend, 'landing-dist')

if (!existsSync(dist)) {
  console.error('[merge] dist/ not found — run `vite build` first.')
  process.exit(1)
}
if (!existsSync(landingDist)) {
  console.error('[merge] landing-dist/ not found — the static landing build is missing.')
  process.exit(1)
}

// Already merged by the vite plugin? → nothing to do.
const marker = 'data-kb-auth-redirect'
const rootIndex = join(dist, 'index.html')
if (existsSync(join(dist, 'chat', 'index.html')) && existsSync(rootIndex)) {
  if (readFileSync(rootIndex, 'utf8').includes(marker)) {
    console.log('[merge] dist/ already merged by the vite plugin — nothing to do.')
    process.exit(0)
  }
}

// 1. Move the freshly built chat SPA into dist/chat/
const chatDir = join(dist, 'chat')
rmSync(chatDir, { recursive: true, force: true })
mkdirSync(chatDir, { recursive: true })
for (const entry of readdirSync(dist)) {
  if (entry === 'chat') continue
  const src = join(dist, entry)
  const st = lstatSync(src)
  if (st.isDirectory()) cpSync(src, join(chatDir, entry), { recursive: true }), rmSync(src, { recursive: true, force: true })
  else renameSync(src, join(chatDir, entry))
}

// 2. Copy the static landing site to the dist root
cpSync(landingDist, dist, { recursive: true })

// 3. Inject the "signed-in → /chat/" redirect into the landing HTML (idempotent)
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
new Function(redirectBody) // refuse to ship broken JS
const inject = `<script ${marker}>${redirectBody}</script>`
let html = readFileSync(rootIndex, 'utf8')
if (!html.includes(marker)) {
  html = html.replace(/<head[^>]*>/i, (m) => `${m}\n    ${inject}`)
  writeFileSync(rootIndex, html)
  console.log('[merge] auth-redirect script injected into landing index.html')
}

console.log('[merge] done → dist/ (landing at root, chat SPA at /chat/)')
