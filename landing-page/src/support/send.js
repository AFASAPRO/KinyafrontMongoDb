// Set VITE_SUPPORT_ENDPOINT (the proxy's /support route) to receive real messages.
// Without it, messages stay in this browser's localStorage so the form still demos correctly.
const EP = import.meta.env.VITE_SUPPORT_ENDPOINT
export async function sendSupport({ email, message }) {
  if (EP) {
    const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, message }) })
    if (!r.ok) throw new Error('Support failed ' + r.status)
    return
  }
  try { const k = 'kinyabot:support', l = JSON.parse(localStorage.getItem(k) || '[]'); l.push({ email, message, at: Date.now() }); localStorage.setItem(k, JSON.stringify(l)) } catch {}
  await new Promise(r => setTimeout(r, 600))
}
