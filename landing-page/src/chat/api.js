// Live mode: set VITE_CHAT_ENDPOINT (see .env.example) to stream real replies from server/proxy.js.
// Without it the widget answers with a built-in demo responder so the UI still works offline.
const ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT
export const isDemo = !ENDPOINT
const sleep = ms => new Promise(r => setTimeout(r, ms))
const canned = [
  [/price|pricing|cost|plan/i, 'Kinyabot AI has three plans: Free ($0), Startup ($12/month, most popular) and Enterprise ($24/month). Yearly billing saves 20%. Want a comparison of what each one includes?'],
  [/schedul|meeting|calendar/i, 'Based on your calendar patterns, I recommend Tuesday at 2pm. That slot has the highest attendance and avoids conflicts with recurring meetings. Should I send the invite?'],
  [/image|photo|picture|generat/i, 'Kinyabot AI can create images from your description — posters, illustrations, logos and more. Tell me what you imagine and I’ll generate it for you.'],
  [/kinya|translat|language|french/i, 'Yes! I speak Kinyarwanda, English and French. Ask me to translate a phrase, practice a greeting or explain something in the language you prefer.'],
  [/secur|data|privacy/i, 'Your data is encrypted in transit and at rest, with role-based access and audit logs across every workspace.'],
  [/hello|hi\b|hey/i, 'Hello 👋 I\'m Kinyabot AI, your companion, always ready. Ask me anything, or try “Teach me a Kinyarwanda phrase” to start.']]
const demoReply = q => (canned.find(([re]) => re.test(q)) || [0, 'Got it! I can answer questions, generate images, write and debug code, or translate across Kinyarwanda, English and French. Tell me a bit more and I’ll get started.'])[1]
export async function* askAI(history) {
  if (!ENDPOINT) { for (const w of demoReply(history.at(-1).content).split(/(\s+)/)) { yield w; await sleep(24) } return }
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }) })
  if (!r.ok || !r.body) throw new Error('Chat endpoint error ' + r.status)
  const rd = r.body.getReader(), dec = new TextDecoder()
  for (;;) { const { done, value } = await rd.read(); if (done) break; yield dec.decode(value, { stream: true }) }
}
