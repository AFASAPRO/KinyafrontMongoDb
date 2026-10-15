// Tiny streaming proxy so your API key never reaches the browser.
// Run:  ANTHROPIC_API_KEY=sk-... npm run proxy   (optional CHAT_MODEL, PORT)
import http from 'node:http'
import { appendFileSync } from 'node:fs'
const KEY = process.env.ANTHROPIC_API_KEY, MODEL = process.env.CHAT_MODEL || 'claude-sonnet-5-5'
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  try {
    let body = ''; for await (const c of req) body += c
    if (req.url === '/subscribe') {
      const { email } = JSON.parse(body)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) { res.writeHead(400); return res.end('Invalid email') }
      appendFileSync('subscribers.txt', email + '\n'); res.writeHead(200); return res.end('ok')
    }
    if (req.url === '/support') {
      const { email, message } = JSON.parse(body)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || !message?.trim()) { res.writeHead(400); return res.end('Invalid') }
      appendFileSync('support.txt', JSON.stringify({ at: new Date().toISOString(), email, message: message.slice(0, 2000) }) + '\n'); res.writeHead(200); return res.end('ok')
    }
    const { messages } = JSON.parse(body)
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, stream: true, system: 'You are SkyAgent, a concise, friendly AI workflow assistant.', messages }) })
    if (!r.ok) { res.writeHead(502); return res.end(await r.text()) }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    const dec = new TextDecoder(); let buf = ''
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true }); const lines = buf.split('\n'); buf = lines.pop()
      for (const l of lines) if (l.startsWith('data: ')) { try { const j = JSON.parse(l.slice(6)); if (j.type === 'content_block_delta' && j.delta?.text) res.write(j.delta.text) } catch {} }
    }
    res.end()
  } catch (e) { res.writeHead(500); res.end(String(e)) }
}).listen(process.env.PORT || 8787, () => console.log('SkyAgent chat proxy on :' + (process.env.PORT || 8787)))
