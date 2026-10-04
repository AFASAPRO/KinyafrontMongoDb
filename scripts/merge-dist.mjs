/**
 * merge-dist.mjs — assemble the final Vercel deployment layout
 * ─────────────────────────────────────────────────────────────
 *   dist/                ← marketing landing page (static clone, landing-dist/)
 *   ├── index.html         • pre-rendered landing HTML (+ injected auth redirect)
 *   ├── assets/…           • landing JS/CSS chunks
 *   ├── media/…            • landing videos/images (self-hosted)
 *   ├── robots.txt, sitemap.xml, google verification
 *   └── chat/            ← the KinyaBot chat SPA (Vue, vite build --base /chat/)
 *       ├── index.html
 *       ├── assets/…
 *       └── (icons, manifests, sw.js, rive/, models/)
 *
 * Vercel (see vercel.json):
 *   /              → landing (static files at dist root)
 *   /chat/(.*)     → /chat/index.html (Vue SPA fallback)
 *
 * The landing index.html gets a tiny inline script injected (idempotent)
 * that sends already-signed-in visitors (localStorage kb_token) straight
 * to /chat/ — members land in the app, guests see the marketing site.
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

// 1. Move the freshly built chat SPA into dist/chat/
const chatDir = join(dist, 'chat')
rmSync(chatDir, { recursive: true, force: true })
mkdirSync(chatDir, { recursive: true })
// Everything Vite emitted at dist root (SPA entry, hashed assets, public
// files) belongs to the chat app → move it all under dist/chat/
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
const marker = 'data-kb-auth-redirect'
const inject = `<script ${marker}>(function(){try{if(localStorage.getItem('kb_token')){var u=new URL(location.href);if(u.searchParams.get('source')!=='pwa'){location.replace('/chat/')}}}catch(e){}})();</script>`
const landingHtmlPath = join(dist, 'index.html')
let html = readFileSync(landingHtmlPath, 'utf8')
if (!html.includes(marker)) {
  html = html.replace(/<head[^>]*>/i, (m) => `${m}\n    ${inject}`)
  writeFileSync(landingHtmlPath, html)
  console.log('[merge] auth-redirect script injected into landing index.html')
}

console.log('[merge] done → dist/ (landing at root, chat SPA at /chat/)')
