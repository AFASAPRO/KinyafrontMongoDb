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
    <div class="error-bubble">
      <i class="fas fa-triangle-exclamation"></i>
      <span>{{ message.content }}</span>
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
      <!-- File attachment -->
      <div v-if="message.file_url" class="attach-preview">
        <img v-if="isImage(message.file_url)" :src="resolveUrl(message.file_url)" class="attach-img" @click="openImg(resolveUrl(message.file_url))" />
        <div v-else class="attach-file">
          <i class="fas fa-file-lines"></i>
          <span>{{ fileName(message.file_url) }}</span>
          <a :href="resolveUrl(message.file_url)" download class="dl-link"><i class="fas fa-download"></i></a>
        </div>
      </div>

      <!-- Bubble content -->
      <div class="bubble" :class="[message.role, {streaming: message._streaming, pending: message._pending}]" :id="`msg-${message.id}`">
        <div class="content" :class="{ prose: message.role==='assistant', 'user-text': message.role==='user' }"
          v-html="rendered"></div>
        <!-- Streaming cursor -->
        <span v-if="message._streaming" class="stream-cursor"></span>
      </div>

      <!-- Actions -->
      <div class="actions" :class="message.role">
        <!-- Copy -->
        <button class="act-btn" :class="{success: copied}" @click="handleCopy" :title="copied?'Copied!':'Copy message'">
          <i :class="copied ? 'fas fa-check' : 'fas fa-copy'"></i>
        </button>

        <!-- AI-only actions -->
        <template v-if="message.role==='assistant'">
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
        <button class="act-btn danger" @click="confirmDelete=true" title="Delete">
          <i class="fas fa-trash-can"></i>
        </button>

        <span class="msg-time">{{ fmtTime }}</span>
      </div>

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
import { ref, computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { useAuthStore } from '../stores/auth'

const props = defineProps({ message: Object })
const emit = defineEmits(['delete', 'copy'])

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
function resolveUrl(url) {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('http')) return url
  return `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}${url}`
}
function fileName(url) { return url.split('/').pop() }
function openImg(src) { lightboxImg.value = src }

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
