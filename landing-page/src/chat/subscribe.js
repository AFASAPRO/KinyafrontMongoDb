// Set VITE_SUBSCRIBE_ENDPOINT (e.g. the proxy's /subscribe route) to collect real emails.
// Without it, emails are only kept in this browser's localStorage so the form still demos correctly.
const EP = import.meta.env.VITE_SUBSCRIBE_ENDPOINT
export async function subscribe(email) {
  if (EP) {
    const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    if (!r.ok) throw new Error('Subscribe failed ' + r.status)
    return
  }
  try { const k = 'skyagent:subscribers', l = JSON.parse(localStorage.getItem(k) || '[]'); if (!l.includes(email)) l.push(email); localStorage.setItem(k, JSON.stringify(l)) } catch {}
  await new Promise(r => setTimeout(r, 600))
}
