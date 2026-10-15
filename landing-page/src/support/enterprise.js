// Enterprise plan requests — sent straight to the Kinyabot backend so the
// superadmin sees them in the console (Superadmin → Enterprise Requests).
// If no backend is reachable (static demo), the request is kept in this
// browser's localStorage so the form still works end-to-end.
const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const LS_KEY = 'kinyabot:enterprise-requests'

export async function sendEnterpriseRequest(payload) {
  try {
    const r = await fetch(`${API}/enterprise-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (r.ok) return { delivered: true }
    const d = await r.json().catch(() => null)
    if (d?.fields) return { delivered: false, fields: d.fields, error: d.error }
    return { delivered: false, error: d?.error || `Request failed (${r.status})` }
  } catch {
    try {
      const l = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
      l.push({ ...payload, at: Date.now() })
      localStorage.setItem(LS_KEY, JSON.stringify(l))
    } catch {}
    // Network-level failure (no backend on static hosting) — keep it local
    return { delivered: false, offline: true }
  }
}
