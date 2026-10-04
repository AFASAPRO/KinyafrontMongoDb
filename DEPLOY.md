# Deploying KinyaBot

## What runs where

| Piece | Host | Notes |
|---|---|---|
| Landing page (`/`) | Vercel | Static clone built from `frontend/landing-dist/` |
| Chat SPA (`/chat/`) | Vercel | Vue 3 app, requires login (guests are sent to the landing page) |
| API server | Render | `backend/` — unchanged, already allows the Vercel domain |

The **build assembles everything automatically**: `vite build` produces a
`dist/` folder that already contains the landing page at the root and the
chat app under `dist/chat/` (see the `kb-merge-landing-dist` plugin in
`vite.config.js`). No extra post-build steps are required — any build
command that runs `vite build` (via `npm run build` or directly) works.

## Vercel settings (frontend)

1. In your Vercel project set **Root Directory** to `frontend`.
2. Framework preset: **Vite** (or "Other" — both work).
3. Build command: `npm run build` (or plain `vite build` — identical result).
4. Output directory: `dist`.
5. Node.js version: 18 or 20.

Every deploy re-runs the build, so nothing needs to be committed from
`dist/` — it is generated (and git-ignored) on the server.

## Resulting URLs

| URL | What visitors get |
|---|---|
| `/` | The marketing landing page. Signed-in users are redirected to `/chat/`. |
| `/chat/` | The chat app — **only** for logged-in users; guests bounce to `/`. |
| `/chat/login`, `/chat/register` | Auth pages (a logged-in user visiting them is sent to the chat). |
| `/sw.js` | A one-time cleanup worker that unregisters the **legacy** root-scope service worker from the previous deployment and reloads the tab. Returning visitors self-heal on their first visit. |

## Local build check

```bash
cd frontend
npm install
npm run build          # → dist/ (landing at root, chat at dist/chat/)
npm run preview        # serves dist/ — note: preview does not apply vercel.json rewrites
```

## Troubleshooting

- **Landing page shows the old chat splash**: a stale deployment or cached
  service worker. Confirm the deployment actually rebuilt (check the build
  log for `[kb-merge] dist assembled → landing at root, chat SPA at /chat/`).
  The `/sw.js` cleanup worker + landing-page unregister script handle the
  rest automatically for returning visitors.
- **`[kb-merge] landing-dist/ is missing`**: the build was run from a copy
  of the project that omitted `frontend/landing-dist/`. Copy it back — it
  is required (it IS the landing page).
