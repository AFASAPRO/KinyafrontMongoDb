/**
 * Functional voice commands — the stuff a real voice assistant understands
 * besides mood moves ("dance", "wave"): stop, repeat, change the reading
 * speed, switch language, or leave voice mode entirely. These are matched
 * and handled entirely on the client, BEFORE the text is ever sent to the
 * AI, so saying "stop" doesn't burn a chat turn or get treated as a real
 * question.
 *
 * Each matcher returns an intent object `{ type, ...extra }` or null.
 * VoiceMode.vue owns executing the intent since it alone holds the audio
 * element, phase state, and router-free "close" affordance.
 */

const RULES = [
  { type: 'stop', re: /^\s*(stop|be quiet|quiet|shh|shush|silence|cancel|never\s?mind|that'?s enough)\s*[.!]?\s*$/i },
  { type: 'repeat', re: /\b(say that again|repeat that|repeat please|what did you say|can you repeat|one more time|come again)\b/i },
  { type: 'slower', re: /\b(read (that |it )?slower|talk slower|slow down|speak slower|too fast)\b/i },
  { type: 'faster', re: /\b(read (that |it )?faster|talk faster|speed up|speak faster|too slow)\b/i },
  { type: 'exit', re: /\b(go back to chat|exit voice( mode)?|leave voice( mode)?|switch to (text|typing)|close voice( mode)?)\b/i },
  { type: 'mute', re: /\b(mute|stop talking|don'?t speak|text only|turn off (your )?voice)\b/i },
  { type: 'unmute', re: /\b(unmute|start talking again|turn on (your )?voice|speak again)\b/i },
  { type: 'forget_me', re: /\b(forget (everything|what you know|me)|clear my memory|delete my memory|forget about me)\b/i },
  { type: 'what_do_you_know', re: /\b(what do you (know|remember) about me|what have you learned about me)\b/i },
  // Language switch — captures the target language name so the caller can
  // turn it into an instruction for the AI (TTS itself is single-voice, see
  // VoiceMode.vue's handling of this intent for the honest caveat).
  { type: 'language', re: /\b(?:switch|speak|reply|talk|respond) (?:to |in )([a-zA-ZÀ-ɏ]+)\b/i, captureLang: true },
]

const LANG_ALIASES = {
  french: 'French', français: 'French', francais: 'French',
  english: 'English',
  kinyarwanda: 'Kinyarwanda', ikinyarwanda: 'Kinyarwanda',
  spanish: 'Spanish', español: 'Spanish',
  swahili: 'Swahili', kiswahili: 'Swahili',
}

/**
 * Matches a functional command. Returns null if the text looks like an
 * ordinary question/request meant for the AI (so "let's talk about French
 * history" is never mistaken for a language switch, etc. — the regexes
 * above are deliberately narrow and anchored to command-like phrasing).
 */
export function matchCommand(text) {
  const t = (text || '').trim()
  if (!t) return null
  for (const rule of RULES) {
    const m = rule.re.exec(t)
    if (!m) continue
    if (rule.captureLang) {
      const lang = LANG_ALIASES[m[1]?.toLowerCase()]
      if (!lang) continue // not a language we recognize — let the AI handle it normally
      return { type: 'language', language: lang }
    }
    return { type: rule.type }
  }
  return null
}
