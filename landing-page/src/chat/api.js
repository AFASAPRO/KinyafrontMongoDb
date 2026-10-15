// Live mode: set VITE_CHAT_ENDPOINT (see .env.example) to stream real replies from server/proxy.js.
// Without it the widget answers with a built-in demo responder so the UI still works offline.
const ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT
export const isDemo = !ENDPOINT
const sleep = ms => new Promise(r => setTimeout(r, ms))
const canned = [
  [/price|pricing|cost|plan/i, 'SkyAgent has three plans: Free ($0), Startup ($12/month, most popular) and Enterprise ($24/month). Yearly billing saves 20%. Want a comparison of what each one includes?'],
  [/schedul|meeting|calendar/i, 'Based on your calendar patterns, I recommend Tuesday at 2pm. That slot has the highest attendance and avoids conflicts with recurring meetings. Should I send the invite?'],
  [/integrat|connect|tool/i, 'SkyAgent connects to the tools you already use, like Linear, Stripe, Figma and Supabase, so tasks can run across them from a single request.'],
  [/secur|data|privacy/i, 'Your data is encrypted in transit and at rest, with role-based access and audit logs across every workspace.'],
  [/hello|hi\b|hey/i, 'Hello 👋 I\'m SkyAgent. Tell me a task, like scheduling, reporting or follow-ups, and I\'ll break it into steps.']]
const demoReply = q => (canned.find(([re]) => re.test(q)) || [0, 'Got it. I\'d break that into steps, run them across your connected tools, and report back with a clear result. Tell me more about what you want to automate and I\'ll outline the plan.'])[1]
export async function* askAI(history) {
  if (!ENDPOINT) { for (const w of demoReply(history.at(-1).content).split(/(\s+)/)) { yield w; await sleep(24) } return }
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }) })
  if (!r.ok || !r.body) throw new Error('Chat endpoint error ' + r.status)
  const rd = r.body.getReader(), dec = new TextDecoder()
  for (;;) { const { done, value } = await rd.read(); if (done) break; yield dec.decode(value, { stream: true }) }
}
