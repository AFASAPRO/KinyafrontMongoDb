  <template>
  <!-- Typing indicator -->
  <div v-if="message._typing" class="msg-row assistant">
    <div class="bot-avatar"><img src="/logo.png" alt="bot" /></div>
    <div class="typing-bubble">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>
  </div>

  <!-- Error message -->
  <div v-else-if="message._error" class="msg-row assistant">
    <div class="bot-avatar"><img src="/logo.png" alt="KinyaBot" /></div>
    <div class="error-wrap">
      <div class="error-bubble">
        <i class="fas fa-triangle-exclamation"></i>
        <span>{{ message.content }}</span>
      </div>
      <div class="error-actions">
        <button class="retry-btn" @click="$emit('retry', message._retryOf || message.id)" aria-label="Retry request" title="Retry">
          <i class="fas fa-rotate-right"></i> Retry
        </button>
      </div>
    </div>
  </div>

  <!-- System message -->
  <div v-else-if="message._system" class="msg-row system-msg">
    <div class="system-bubble">
      <i class="fas fa-circle-info"></i>
      <span>{{ message.content }}</span>
    </div>
  </div>

  <!-- Normal message -->
  <div v-else class="msg-row" :class="message.role">
    <div v-if="message.role==='assistant'" class="bot-avatar">
      <img src="/logo.png" alt="KinyaBot" />
    </div>

    <div class="bubble-col" :class="message.role">
      <!-- Attachments (structured + legacy) -->
      <div v-if="attachmentItems.length" class="attach-previews">
        <MessageAttachment
          v-for="(att, i) in attachmentItems"
          :key="i"
          :attachment="att"
          :legacy-url="att ? null : message.file_url"
          @open="openImg"
        />
      </div>

      <!-- Bubble content -->
      <div class="bubble" :class="[message.role, {streaming: message._streaming, pending: message._pending}]" :id="`msg-${message.id}`">
        <div class="content" :class="{ prose: message.role==='assistant', 'user-text': message.role==='user' }"
          v-html="rendered"></div>
        <!-- Thinking indicator while the first tokens arrive -->
        <div v-if="message._streaming && !message.content" class="thinking">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="thinking-label">KinyaBot is thinking…</span>
        </div>
        <!-- Streaming cursor -->
        <span v-else-if="message._streaming" class="stream-cursor"></span>
      </div>

      <!-- Cancelled marker -->
      <div v-if="message._status === 'cancelled' && message.role === 'assistant'" class="cancelled-note">
        <i class="fas fa-ban"></i> Generation stopped
      </div>

      <!-- Source references — only when the backend actually knows them -->
      <div v-if="message.sources?.length" class="sources-line">
        <i class="fas fa-file-shield"></i>
        <span>Source: {{ message.sources.join(', ') }}</span>
      </div>

      <!-- Actions -->
      <div class="actions" :class="[message.role, { 'always-on': message._status === 'failed' || ttsActive }]">
        <!-- Copy -->
        <button class="act-btn" :class="{success: copied}" @click="handleCopy" :title="copied?'Copied!':'Copy message'" :aria-label="copied?'Copied':'Copy message'">
          <i :class="copied ? 'fas fa-check' : 'fas fa-copy'"></i>
        </button>

        <!-- Retry for failed user sends -->
        <button v-if="message.role==='user' && message._status === 'failed'" class="act-btn retry-act" @click="$emit('retry', message.id)" title="Retry send" aria-label="Retry send">
          <i class="fas fa-rotate-right"></i>
        </button>

        <!-- AI-only actions -->
        <template v-if="message.role==='assistant' && !message._error">
          <!-- Listen (TTS) -->
          <button
            v-if="canListen"
            class="act-btn"
            :class="{active: ttsState !== 'idle'}"
            @click="toggleListen"
            :title="listenTitle"
            :aria-label="listenTitle"
          >
            <i v-if="ttsState === 'loading'" class="fas fa-spinner fa-spin"></i>
            <i v-else-if="ttsState === 'playing'" class="fas fa-pause"></i>
            <i v-else class="fas fa-volume-high"></i>
          </button>
          <!-- Stop audio while playing -->
          <button v-if="ttsState === 'playing'" class="act-btn" @click="stopListen" title="Stop audio" aria-label="Stop audio">
            <i class="fas fa-stop"></i>
          </button>
          <!-- Regenerate (last assistant message only) -->
          <button v-if="isLast" class="act-btn" :class="{spin: regenBusy}" @click="$emit('regenerate')" title="Regenerate response" aria-label="Regenerate response">
            <i class="fas fa-rotate-right"></i>
          </button>
          <!-- Like -->
          <button class="act-btn" :class="{liked: liked===true}" @click="handleLike(true)" title="Helpful">
            <i :class="liked===true ? 'fas fa-thumbs-up' : 'far fa-thumbs-up'"></i>
          </button>
          <!-- Unlike -->
          <button class="act-btn" :class="{disliked: liked===false}" @click="handleLike(false)" title="Not helpful">
            <i :class="liked===false ? 'fas fa-thumbs-down' : 'far fa-thumbs-down'"></i>
          </button>
          <!-- Share -->
          <button class="act-btn" @click="handleShare" title="Share">
            <i class="fas fa-share-nodes"></i>
          </button>
          <!-- Download code (if has code block) -->
          <button v-if="hasCode" class="act-btn" @click="downloadCode" title="Download code">
            <i class="fas fa-download"></i>
          </button>
        </template>

        <!-- Delete -->
        <button class="act-btn danger" @click="confirmDelete=true" title="Delete" aria-label="Delete message">
          <i class="fas fa-trash-can"></i>
        </button>

        <span class="msg-time">{{ fmtTime }}</span>
      </div>

      <!-- TTS honest error -->
      <transition name="fade">
        <div v-if="ttsError" class="tts-error">{{ ttsError }}</div>
      </transition>

      <!-- Feedback text after like/dislike -->
      <transition name="fade">
        <div v-if="feedbackMsg" class="feedback-msg">{{ feedbackMsg }}</div>
      </transition>
    </div>

    <div v-if="message.role==='user'" class="user-avatar">
      <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" />
      <span v-else>{{ userInitial }}</span>
    </div>
  </div>

  <!-- Delete confirm -->
  <teleport to="body">
    <div v-if="confirmDelete" class="del-overlay" @click.self="confirmDelete=false">
      <div class="del-modal">
        <h4><i class="fas fa-trash-can"></i> Delete message?</h4>
        <p>This action cannot be undone.</p>
        <div class="del-actions">
          <button @click="confirmDelete=false">Cancel</button>
          <button class="del-confirm" @click="doDelete">Delete</button>
        </div>
      </div>
    </div>
  </teleport>

  <!-- Image lightbox -->
  <teleport to="body">
    <div v-if="lightboxImg" class="lightbox" @click="lightboxImg=null">
      <img :src="lightboxImg" @click.stop />
      <button class="lb-close" @click="lightboxImg=null"><i class="fas fa-xmark"></i></button>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import MessageAttachment from './MessageAttachment.vue'
import { register as registerAudio, unregister as unregisterAudio } from '../utils/audio'
import hljs from 'highlight.js/lib/core'
// Register only the languages KinyaBot users actually get back from the AI.
// (importing the full highlight.js bundle adds ~700 kB to the bundle)
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import csharp from 'highlight.js/lib/languages/csharp'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'

const LANGS = { javascript, typescript, python, xml, html: xml, css, java, cpp, c, csharp, bash, sh: bash, json, sql, ruby, php, go, rust, kotlin, swift, yaml, markdown, plaintext }
Object.entries(LANGS).forEach(([name, def]) => hljs.registerLanguage(name, def))
hljs.registerAliases(['js'], { languageName: 'javascript' })
hljs.registerAliases(['ts'], { languageName: 'typescript' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['shell', 'zsh'], { languageName: 'bash' })

const props = defineProps({
  message: Object,
  isLast: { type: Boolean, default: false },       // last assistant message → regenerate
  regenBusy: { type: Boolean, default: false }
})
const emit = defineEmits(['delete', 'copy', 'retry', 'regenerate'])

const auth = useAuthStore()
const userInitial = computed(() => auth.user?.username?.[0]?.toUpperCase() || 'U')

const liked = ref(null) // true=liked, false=disliked, null=neutral
const copied = ref(false)
const confirmDelete = ref(false)
const feedbackMsg = ref('')
const lightboxImg = ref(null)

// Marked setup
const renderer = new marked.Renderer()
renderer.code = (code, lang) => {
  const language = hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(String(code), { language }).value
  const safeLang = lang || 'text'
  const ext = { javascript:'js', typescript:'ts', python:'py', html:'html', css:'css', java:'java', cpp:'cpp', c:'c', bash:'sh', json:'json', sql:'sql', ruby:'rb', php:'php', go:'go', rust:'rs', kotlin:'kt', swift:'swift' }[safeLang] || 'txt'
  return `<div class="code-block" data-lang="${safeLang}" data-ext="${ext}">
    <div class="code-header">
      <span class="code-lang">${safeLang}</span>
      <div class="code-actions">
        <button class="copy-code-btn" onclick="(function(btn){const code=btn.closest('.code-block').querySelector('code');navigator.clipboard.writeText(code.innerText);btn.innerHTML='<i class=\\'fas fa-check\\'></i> Copied';setTimeout(()=>{btn.innerHTML='<i class=\\'fas fa-copy\\'></i> Copy'},1500)})(this)">
          <i class='fas fa-copy'></i> Copy
        </button>
        <button class="download-code-btn" onclick="(function(btn){const block=btn.closest('.code-block');const code=block.querySelector('code').innerText;const ext=block.dataset.ext||'txt';const lang=block.dataset.lang||'code';const blob=new Blob([code],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kinyabot-code-'+Date.now()+'.'+ext;a.click()})(this)">
          <i class='fas fa-download'></i> Download
        </button>
      </div>
    </div>
    <pre class="hljs"><code class="language-${language}">${highlighted}</code></pre>
  </div>`
}
marked.use({ renderer, breaks: true, gfm: true })

// Emoji reaction system - adds contextual emoji to AI responses
function addEmojiReactions(text) {
  if (!text || text.length < 5) return text
  // Greetings
  if (/^(hello|hi|hey|muraho|bonjour|salut|greetings|good morning|good evening)/i.test(text.trim())) {
    return text.replace(/^([^\n!.?]{2,60})/i, '$1 👋')
  }
  // Code / programming
  if (/```|`[^`]|function |const |class |import |def |print\(|console\.log/i.test(text)) {
    return text + '\n\n> 💡 *Tip: Use the Copy and Download buttons on each code block above.*'
  }
  // Success / done / completed
  if (/\b(done|completed|finished|success|great|excellent|perfect|wonderful)\b/i.test(text)) {
    return text.replace(/\b(done|completed|finished|success)\b/i, '$1 ✅')
  }
  // Error / warning / careful
  if (/\b(error|warning|caution|careful|important|note:|⚠️)\b/i.test(text)) {
    return text.replace(/\b(error|warning|caution)\b/i, '$1 ⚠️')
  }
  // Steps / instructions
  if (/^(step\s+\d|1\.|first,|to start|here\'s how|follow these)/im.test(text)) {
    return '📋 ' + text
  }
  // Questions / thinking
  if (/\?$/.test(text.trim()) || /\b(what do you think|let me know|feel free|would you like)/i.test(text)) {
    return text + ' 💬'
  }
  // Ideas / creativity
  if (/\b(idea|creative|innovative|design|concept|brainstorm)\b/i.test(text)) {
    return text.replace(/\b(idea|ideas)\b/i, '$1 💡')
  }
  // AI / technology
  if (/\b(machine learning|artificial intelligence|neural network|algorithm|data science)\b/i.test(text)) {
    return text.replace(/\b(machine learning|artificial intelligence)\b/i, '$1 🤖')
  }
  // Security
  if (/\b(security|password|encryption|auth|token|secure|hack|vulnerability)\b/i.test(text)) {
    return text.replace(/\b(security|secure)\b/i, '$1 🔐')
  }
  // Math / science
  if (/\b(formula|equation|calculate|math|physics|chemistry|biology)\b/i.test(text)) {
    return text.replace(/\b(formula|equation)\b/i, '$1 🔢')
  }
  // Money / business
  if (/\b(money|revenue|profit|budget|invest|financial|business|startup)\b/i.test(text)) {
    return text.replace(/\b(money|revenue|profit)\b/i, '$1 💰')
  }
  // Time / schedule
  if (/\b(time|schedule|deadline|calendar|date|soon|quickly)\b/i.test(text)) {
    return text.replace(/\b(deadline|schedule)\b/i, '$1 ⏰')
  }
  // Fun / celebration
  if (/\b(congratulations|congrats|celebrate|party|amazing|fantastic|awesome|wow)\b/i.test(text)) {
    return text.replace(/\b(congratulations|congrats|amazing)\b/i, '$1 🎉')
  }
  // Learning / education
  if (/\b(learn|study|course|tutorial|guide|lesson|education|teach)\b/i.test(text)) {
    return text.replace(/\b(learn|study|tutorial)\b/i, '$1 📚')
  }
  // Rocket / launch
  if (/\b(launch|deploy|release|ship|publish|go live)\b/i.test(text)) {
    return text.replace(/\b(launch|deploy)\b/i, '$1 🚀')
  }
  return text
}

const rendered = computed(() => {
  if (!props.message.content) return ''
  if (props.message.role === 'user') {
    return props.message.content
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>')
  }
  const enhanced = addEmojiReactions(props.message.content)
  return marked.parse(enhanced)
})

const hasCode = computed(() => /```[\s\S]*?```/.test(props.message.content || '') || props.message.content?.includes('<code-block'))

const fmtTime = computed(() => {
  if (!props.message.created_at) return ''
  return new Date(props.message.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
})

function isImage(url) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) }
function openImg(src) { lightboxImg.value = src }

/* ── Attachments (structured new + legacy file_url) ─────────── */
const attachmentItems = computed(() => {
  const list = []
  if (Array.isArray(props.message.attachments) && props.message.attachments.length) {
    for (const a of props.message.attachments) list.push(a)
  } else if (props.message.file_url) {
    list.push(null) // legacy → MessageAttachment resolves from legacyUrl
  }
  return list
})

/* ── Voice output (TTS) — optional Listen button, §13 ───────── */
const ttsState = ref('idle')   // idle | loading | playing | paused
const ttsError = ref('')
const ttsActive = computed(() => ttsState.value === 'playing' || ttsState.value === 'paused')
const canListen = computed(() =>
  props.message.role === 'assistant' &&
  !props.message._streaming &&
  (props.message.content || '').trim().length > 0 &&
  !props.message._error && props.message._status !== 'cancelled'
)
const listenTitle = computed(() =>
  ({ loading: 'Generating audio…', playing: 'Pause audio', paused: 'Resume audio', idle: 'Listen to this response' })[ttsState.value]
)
let audioEl = null
let ttsErrorTimer = null

function stopOtherAudio() {
  if (audioEl) registerAudio(audioEl, { forceIdle }) // pauses whoever else is playing
}

async function toggleListen() {
  if (ttsState.value === 'playing') { audioEl?.pause(); ttsState.value = 'paused'; return }
  if (ttsState.value === 'paused') { stopOtherAudio(); audioEl?.play(); ttsState.value = 'playing'; return }
  if (ttsState.value === 'loading') return
  ttsState.value = 'loading'
  ttsError.value = ''
  try {
    if (!audioEl) {
      const res = await api.post('/tts', { text: props.message.content }, { responseType: 'blob', timeout: 90000 })
      audioEl = new Audio(URL.createObjectURL(res.data))
      audioEl.onended = () => { ttsState.value = 'idle' }
    }
    stopOtherAudio()
    await audioEl.play()
    ttsState.value = 'playing'
  } catch (err) {
    ttsState.value = 'idle'
    let msg = null
    const d = err?.response?.data
    if (d instanceof Blob) { try { msg = JSON.parse(await d.text()).error } catch {} }
    else msg = err?.response?.data?.error
    ttsError.value = msg || 'KinyaBot could not generate audio for this response right now.'
    clearTimeout(ttsErrorTimer)
    ttsErrorTimer = setTimeout(() => { ttsError.value = '' }, 6000)
  }
}

function stopListen() {
  if (audioEl) { audioEl.pause(); audioEl.currentTime = 0 }
  ttsState.value = 'idle'
}

function forceIdle() { if (ttsState.value !== 'idle') ttsState.value = 'idle' }

onBeforeUnmount(() => {
  if (audioEl) { unregisterAudio(audioEl); audioEl.pause(); audioEl = null }
  clearTimeout(ttsErrorTimer)
})

async function handleCopy() {
  const text = props.message.content || ''
  await navigator.clipboard.writeText(text).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
  emit('copy')
}

function handleLike(val) {
  if (liked.value === val) { liked.value = null; feedbackMsg.value = ''; return }
  liked.value = val
  feedbackMsg.value = val ? 'Thanks for the feedback!' : 'We\'ll improve this response.'
  setTimeout(() => { feedbackMsg.value = '' }, 3000)
}

async function handleShare() {
  const text = `KinyaBot AI Response:\n\n${props.message.content}`
  if (navigator.share) {
    await navigator.share({ title:'KinyaBot AI', text }).catch(() => {})
  } else {
    await navigator.clipboard.writeText(text).catch(() => {})
    alert('Response copied to clipboard for sharing!')
  }
}

function downloadCode() {
  // Extract first code block from content
  const match = props.message.content?.match(/```(\w+)?\n?([\s\S]*?)```/)
  if (!match) return
  const lang = match[1] || 'txt'
  const code = match[2]
  const ext = { javascript:'js', typescript:'ts', python:'py', html:'html', css:'css', java:'java', cpp:'cpp', bash:'sh', json:'json', sql:'sql' }[lang] || 'txt'
  const blob = new Blob([code], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `kinyabot-code.${ext}`
  a.click()
}

function doDelete() {
  confirmDelete.value = false
  emit('delete')
}
</script>

<style scoped>
.msg-row { display:flex; align-items:flex-start; gap:10px; margin-bottom:4px; padding:8px 0; animation:fadeUp .28s ease both; }
.msg-row.user { flex-direction:row-reverse; }

.bot-avatar { width:32px; height:32px; border-radius:50%; overflow:hidden; flex-shrink:0; background:var(--bg-card); border:1px solid var(--border-md); display:flex; align-items:center; justify-content:center; }
.bot-avatar img { width:100%; height:100%; object-fit:contain; }
.user-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#a855f7); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; overflow:hidden; }
.user-avatar img { width:100%; height:100%; object-fit:cover; }

.typing-bubble { display:flex; align-items:center; gap:5px; padding:12px 16px; background:var(--bg-card); border-radius:0 var(--r-lg) var(--r-lg) var(--r-lg); border:1px solid var(--border); }
.dot { width:7px; height:7px; border-radius:50%; background:var(--text-3); animation:blink 1.3s infinite both; }
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}

/* Error bubble */
.error-bubble {
  display:flex; align-items:center; gap:9px;
  padding:10px 14px;
  background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2);
  border-radius:0 var(--r-lg) var(--r-lg) var(--r-lg);
  color:#f87171; font-size:13.5px; max-width:480px;
}
.error-bubble i { font-size:15px; flex-shrink:0; }
.error-wrap { display:flex; flex-direction:column; gap:6px; }
.error-actions { display:flex; }
.retry-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:6px 14px; border-radius:99px; font-size:12.5px; font-weight:600;
  background:var(--bg-card); border:1px solid var(--border-md);
  color:var(--text-1); cursor:pointer; transition:all .2s;
}
.retry-btn:hover { border-color:rgba(109,40,217,.5); background:rgba(109,40,217,.12); }
.retry-btn i { font-size:11px; }
.retry-act { color:var(--blue) !important; }

/* Attachments stack */
.attach-previews { display:flex; flex-direction:column; gap:6px; align-items:flex-start; max-width:100%; }
.bubble-col.user .attach-previews { align-items:flex-end; }

/* Thinking indicator */
.thinking { display:flex; align-items:center; gap:5px; padding:6px 0; }
.thinking-label { font-size:12.5px; color:var(--text-3); margin-left:4px; font-style:italic; }
.thinking .dot { width:6px; height:6px; border-radius:50%; background:var(--text-3); animation:blink 1.3s infinite both; }
.thinking .dot:nth-child(2){animation-delay:.2s}.thinking .dot:nth-child(3){animation-delay:.4s}

/* Cancelled marker */
.cancelled-note { display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--text-3); margin-top:3px; }
.cancelled-note i { font-size:10px; }

/* Source references (backend-verified only) */
.sources-line {
  display:inline-flex; align-items:center; gap:6px;
  margin-top:5px; padding:3px 10px;
  background:var(--bg-card); border:1px solid var(--border);
  border-radius:99px; font-size:11px; color:var(--text-3); max-width:100%;
}
.sources-line i { color:#c4b5fd; font-size:10px; flex-shrink:0; }
.sources-line span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* TTS */
.tts-error { font-size:11.5px; color:#f87171; margin-top:3px; }
.act-btn.active { color:#c4b5fd !important; background:rgba(109,40,217,.14); }
.act-btn.spin i { animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.actions.always-on { opacity:1; }
  
/* System message */
.msg-row.system-msg { justify-content:center; }
.system-bubble {
  display:flex; align-items:center; gap:8px;
  padding:8px 14px;
  background:rgba(99,102,241,.08); border:1px solid rgba(99,102,241,.2);
  border-radius:99px; color:#a5b4fc; font-size:12.5px;
}

.bubble-col { display:flex; flex-direction:column; max-width:72%; }
.bubble-col.user { align-items:flex-end; }
.bubble-col.assistant { align-items:flex-start; }

.attach-preview { margin-bottom:6px; }
.attach-img { max-width:240px; max-height:200px; border-radius:var(--r-sm); cursor:zoom-in; transition:opacity .2s; }
.attach-img:hover { opacity:.9; }
.attach-file { display:inline-flex; align-items:center; gap:8px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-sm); padding:8px 12px; font-size:12.5px; color:var(--text-2); }
.dl-link { color:var(--blue); margin-left:4px; }

.bubble { width:100%; position:relative; }
.bubble.user { background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-lg) var(--r-sm) var(--r-lg) var(--r-lg); padding:11px 15px; }
.bubble.assistant { padding:4px 0; }
.bubble.pending { opacity:.7; }
.bubble.streaming { }

/* Streaming cursor */
.stream-cursor {
  display:inline-block; width:2px; height:16px;
  background:var(--text-1); border-radius:1px;
  margin-left:2px; vertical-align:middle;
  animation:blink-cursor .7s ease-in-out infinite;
}
@keyframes blink-cursor { 0%,100%{opacity:1} 50%{opacity:0} }

.content { font-size:14px; line-height:1.65; }
.user-text { color:var(--text-1); white-space:pre-wrap; word-break:break-word; }

.actions { display:flex; align-items:center; gap:2px; margin-top:4px; opacity:0; transition:opacity .2s; flex-wrap:wrap; }
.actions.user { justify-content:flex-end; }
.bubble-col:hover .actions { opacity:1; }
.act-btn { width:28px; height:28px; border-radius:6px; background:none; border:none; color:var(--text-3); font-size:12.5px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
.act-btn:hover { background:var(--bg-hover); color:var(--text-1); }
.act-btn.success { color:#34a853 !important; }
.act-btn.liked { color:#4285f4 !important; }
.act-btn.disliked { color:#f28b82 !important; }
.act-btn.danger:hover { background:rgba(242,139,130,.12); color:#f28b82; }
.msg-time { font-size:11px; color:var(--text-3); margin-left:4px; }

.feedback-msg { font-size:11.5px; color:var(--text-2); padding:3px 4px; animation:fadeUp .2s ease; font-style:italic; }

/* Delete confirm */
.del-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:999; backdrop-filter:blur(4px); }
.del-modal { width:300px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-lg); padding:1.25rem; animation:fadeUp .2s ease; }
.del-modal h4 { font-size:14px; font-weight:600; margin-bottom:.6rem; display:flex; align-items:center; gap:8px; color:#f28b82; }
.del-modal p { font-size:12.5px; color:var(--text-2); margin-bottom:1rem; }
.del-actions { display:flex; gap:8px; justify-content:flex-end; }
.del-actions button { padding:7px 16px; border:none; border-radius:var(--r-sm); font-size:13px; cursor:pointer; transition:all .2s; }
.del-actions button:first-child { background:var(--bg-hover); color:var(--text-2); }
.del-actions button:first-child:hover { color:var(--text-1); }
.del-confirm { background:#991b1b; color:#fff !important; }
.del-confirm:hover { opacity:.85; }

/* Lightbox */
.lightbox { position:fixed; inset:0; background:rgba(0,0,0,.88); display:flex; align-items:center; justify-content:center; z-index:1000; cursor:zoom-out; }
.lightbox img { max-width:90vw; max-height:90vh; object-fit:contain; border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,.6); cursor:default; }
.lb-close { position:absolute; top:16px; right:16px; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.1); border:none; color:#fff; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.lb-close:hover { background:rgba(255,255,255,.2); }

@media(max-width:600px){.bubble-col{max-width:88%}}
</style>

<style>
/* Global styles for code blocks rendered inside v-html */
.code-block { border-radius:8px; overflow:hidden; border:1px solid var(--border-md,rgba(255,255,255,.11)); margin:.75rem 0; }
.code-header { display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:rgba(0,0,0,.4); }
.code-lang { color:#c4b5fd; font-size:11.5px; font-weight:600; font-family:monospace; }
.code-actions { display:flex; gap:6px; }
.copy-code-btn,.download-code-btn { background:none; border:none; color:var(--text-2,#9aa0a6); font-size:11px; cursor:pointer; padding:3px 8px; border-radius:4px; transition:all .2s; display:flex; align-items:center; gap:4px; font-family:inherit; }
.copy-code-btn:hover,.download-code-btn:hover { background:rgba(255,255,255,.08); color:var(--text-1,#e3e3e3); }
.hljs { background:#0d0d0f!important; padding:12px 14px!important; font-size:13px!important; display:block; overflow-x:auto; }
</style>
