/**
 * Lightweight keyword matcher that maps chat text to one of the buddy's
 * procedural moves (see poses.js). Runs entirely on the client — it never
 * changes the chat/AI contract with the backend, it just decides which
 * animation to play alongside a real Groq-generated reply.
 */

const COMMANDS = [
  [/\b(jump|hop|leap)\b/i, 'jump'],
  [/\b(dance|boogie|groove)\b/i, 'dance'],
  [/\b(clap|applaud|applause)\b/i, 'clap'],
  [/\b(cheer|celebrate|party|hooray|yay|congrat)/i, 'cheer'],
  [/\b(spin|twirl|turn around|rotate)\b/i, 'spin'],
  [/\b(wave|say hi|say hello)\b/i, 'wave'],
  [/\b(bow|take a bow)\b/i, 'bow'],
  [/\b(laugh|giggle|lol|haha)/i, 'laugh'],
  [/\b(shrug|no idea|dunno|not sure)\b/i, 'shrug'],
  [/\b(think|ponder|hmm)\b/i, 'think'],
  [/\b(sad|cry|frown|sorry to hear)\b/i, 'sad'],
  [/\b(surprise|wow|shock|whoa)\b/i, 'wow'],
  [/\b(nod|say yes)\b/i, 'nod'],
  [/\b(shake (your )?head|say no)\b/i, 'shake'],
]

const isRequest = (t) =>
  /\b(can you|could you|would you|will you|please|pls|show me|do a|do an|let'?s see|go ahead|try|start|now)\b/i.test(t) ||
  t.trim().split(/\s+/).length <= 3

/** A move the USER explicitly asked for ("can you dance?"). */
export function matchRequestedMove(text) {
  const t = (text || '').trim()
  if (!t || !isRequest(t)) return null
  for (const [re, move] of COMMANDS) if (re.test(t)) return move
  return null
}

/** A gentle reaction move inferred from the ASSISTANT's reply tone. */
export function matchReactionMove(text) {
  const t = (text || '').trim()
  if (!t) return null
  if (/\b(congrat|amazing|awesome|great job|fantastic|well done|yay|woohoo)/i.test(t)) return 'cheer'
  if (/\b(haha|lol|funny|joke)/i.test(t)) return 'laugh'
  if (/\b(sorry|unfortunately|sad|difficult|hard time)/i.test(t)) return 'sad'
  if (/\b(hmm|let me think|not entirely sure|it depends)/i.test(t)) return 'think'
  if (/\?\s*$/.test(t)) return 'nod'
  return null
}
