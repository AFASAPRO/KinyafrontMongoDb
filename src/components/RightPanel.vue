<template>
  <aside class="right-panel" aria-label="Conversation details">
    <!-- ── Header ── -->
    <header class="rp-top">
      <h2 class="rp-heading">Details</h2>
      <button class="rp-icon" @click="$emit('close')" title="Close panel" aria-label="Close details panel">
        <i class="fas fa-xmark"></i>
      </button>
    </header>

    <!-- ── Empty state (no open chat) ── -->
    <div v-if="!chat" class="rp-empty-state">
      <span class="rp-empty-ico"><i class="fas fa-layer-group"></i></span>
      <strong>No chat open</strong>
      <p>Open or start a conversation to see its code, files and settings here.</p>
    </div>

    <div v-else class="rp-scroll">
      <!-- ══ 1. Chat header ══ -->
      <section class="rp-card rp-chat">
        <div class="rp-title-row">
          <input v-if="renaming" ref="renameRef" v-model="renameVal" class="rp-title-input" maxlength="80"
                 aria-label="Chat title" @keydown.enter.prevent="commitRename" @keydown.esc="renaming=false" @blur="commitRename" />
          <button v-else class="rp-title" :title="'Rename: ' + chat.title" @click="startRename">
            <span>{{ chat.title }}</span>
            <i class="fas fa-pen" aria-hidden="true"></i>
          </button>
        </div>
        <div class="rp-meta">
          <span><i class="fas fa-message"></i>{{ messageCount }} {{ messageCount === 1 ? 'message' : 'messages' }}</span>
          <span v-if="chat.updated_at || chat.created_at"><i class="fas fa-clock"></i>{{ relTime(chat.updated_at || chat.created_at) }}</span>
        </div>
        <div class="rp-actions">
          <button class="rp-btn" @click="handleExport" :disabled="!messageCount"><i class="fas fa-file-export"></i>Export</button>
          <button class="rp-btn" @click="handleShare"><i class="fas fa-share-nodes"></i>{{ shared ? 'Copied' : 'Share' }}</button>
        </div>
      </section>

      <!-- ══ 2. Code & snippets ══ -->
      <section class="rp-sec">
        <button class="rp-sec-head" :aria-expanded="open.code" @click="toggle('code')">
          <i class="fas fa-code"></i><span>Code &amp; snippets</span>
          <em v-if="codeBlocks.length" class="rp-count">{{ codeBlocks.length }}</em>
          <i class="fas fa-chevron-down chev" :class="{ closed: !open.code }"></i>
        </button>
        <div v-show="open.code" class="rp-sec-body">
          <ul v-if="codeBlocks.length" class="rp-list">
            <li v-for="b in codeBlocks" :key="b.key" class="code-item">
              <div class="code-top">
                <span class="lang-chip">{{ b.lang }}</span>
                <span class="code-lines">{{ b.lines }} {{ b.lines === 1 ? 'line' : 'lines' }}</span>
                <div class="code-tools">
                  <button class="rp-icon sm" :title="copiedKey===b.key ? 'Copied' : 'Copy code'" :aria-label="'Copy ' + b.lang + ' code'" @click="copyCode(b)">
                    <i :class="copiedKey===b.key ? 'fas fa-check ok' : 'fas fa-copy'"></i>
                  </button>
                  <button class="rp-icon sm" title="Download" :aria-label="'Download ' + b.lang + ' code'" @click="downloadCode(b)"><i class="fas fa-download"></i></button>
                </div>
              </div>
              <button class="code-preview" :title="'Jump to message'" @click="jumpTo(b.msgId)">
                <code>{{ b.preview }}</code>
                <span class="jump">Jump to message <i class="fas fa-arrow-right"></i></span>
              </button>
            </li>
          </ul>
          <p v-else class="rp-hint"><i class="fas fa-terminal"></i>Code from this chat will be collected here.</p>
        </div>
      </section>

      <!-- ══ 3. Files & attachments ══ -->
      <section class="rp-sec">
        <button class="rp-sec-head" :aria-expanded="open.files" @click="toggle('files')">
          <i class="fas fa-paperclip"></i><span>Files &amp; attachments</span>
          <em v-if="files.length" class="rp-count">{{ files.length }}</em>
          <i class="fas fa-chevron-down chev" :class="{ closed: !open.files }"></i>
        </button>
        <div v-show="open.files" class="rp-sec-body">
          <template v-if="files.length">
            <div v-if="imageFiles.length" class="thumb-grid">
              <button v-for="f in imageFiles" :key="f.key" class="thumb" :title="f.name" @click="jumpTo(f.msgId)">
                <img v-if="thumbs[f.key]" :src="thumbs[f.key]" :alt="f.name" loading="lazy" />
                <i v-else class="fas fa-image"></i>
              </button>
            </div>
            <ul v-if="otherFiles.length" class="rp-list">
              <li v-for="f in otherFiles" :key="f.key" class="file-row">
                <span class="file-ico"><i :class="f.kind==='audio' ? 'fas fa-headphones' : 'fas fa-file-lines'"></i></span>
                <button class="file-info" :title="'Jump to message'" @click="jumpTo(f.msgId)">
                  <span class="file-name">{{ f.name }}</span>
                  <small>{{ f.meta }}</small>
                </button>
                <button class="rp-icon sm" title="Download" :aria-label="'Download ' + f.name" @click="download(f)"><i class="fas fa-download"></i></button>
              </li>
            </ul>
          </template>
          <p v-else class="rp-hint"><i class="fas fa-file-circle-plus"></i>Images and documents you share will appear here.</p>
        </div>
      </section>

      <!-- ══ 4. Chat settings ══ -->
      <section class="rp-sec">
        <button class="rp-sec-head" :aria-expanded="open.settings" @click="toggle('settings')">
          <i class="fas fa-sliders"></i><span>Chat settings</span>
          <i class="fas fa-chevron-down chev" :class="{ closed: !open.settings }"></i>
        </button>
        <div v-show="open.settings" class="rp-sec-body">
          <label class="field-label" for="rp-lang">Response language</label>
          <div class="select-wrap">
            <select id="rp-lang" class="rp-select" :value="prefs.lang" @change="setPref({ lang: $event.target.value })">
              <option value="">Auto (match my message)</option>
              <option v-for="l in LANGS" :key="l.id" :value="l.id">{{ l.label }}</option>
            </select>
            <i class="fas fa-chevron-down" aria-hidden="true"></i>
          </div>

          <span id="rp-style-label" class="field-label">Reply style</span>
          <div class="seg" role="radiogroup" aria-labelledby="rp-style-label">
            <button v-for="s in STYLES" :key="s.id" class="seg-btn" role="radio"
                    :aria-checked="(prefs.style || 'balanced') === s.id"
                    :class="{ on: (prefs.style || 'balanced') === s.id }"
                    @click="setPref({ style: s.id === 'balanced' ? '' : s.id })">{{ s.label }}</button>
          </div>
          <p class="rp-note">Applies to this chat only, starting with your next message.</p>
        </div>
      </section>

      <!-- ══ 5. Usage ══ -->
      <section class="rp-sec">
        <button class="rp-sec-head" :aria-expanded="open.usage" @click="toggle('usage')">
          <i class="fas fa-chart-simple"></i><span>Usage</span>
          <i class="fas fa-chevron-down chev" :class="{ closed: !open.usage }"></i>
        </button>
        <div v-show="open.usage" class="rp-sec-body">
          <div class="stat-row">
            <div class="stat"><strong>{{ fmt(chatTokens.value) }}</strong><small>{{ chatTokens.exact ? 'tokens in this chat' : 'tokens in this chat (est.)' }}</small></div>
            <div class="stat"><strong>{{ fmt(chatStore.stats.total_chats) }}</strong><small>total chats</small></div>
          </div>
          <div class="usage-line">
            <span>{{ usage.remaining }} of {{ usage.daily_limit }} messages left today</span>
            <span class="pct">{{ usagePct }}%</span>
          </div>
          <div class="bar" role="progressbar" :aria-valuenow="usagePct" aria-valuemin="0" aria-valuemax="100" aria-label="Daily messages used">
            <i :style="{ width: usagePct + '%' }" :class="{ warn: usagePct >= 80 }"></i>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import api from '../api'
import { loadAttachmentUrl, downloadAttachment } from '../utils/attachments'

const emit = defineEmits(['load-chat', 'close'])
const chatStore = useChatStore()

const chat = computed(() => chatStore.activeChat)
const realMessages = computed(() => chatStore.messages.filter(m => !m._typing))
const messageCount = computed(() => realMessages.value.filter(m => m.role === 'user' || m.role === 'assistant').length)

/* ── Collapsible sections (remembered) ── */
const open = reactive((() => {
  const d = { code: true, files: true, settings: true, usage: true }
  try { return { ...d, ...JSON.parse(localStorage.getItem('kb_rp_open') || '{}') } } catch { return d }
})())
function toggle(k) {
  open[k] = !open[k]
  try { localStorage.setItem('kb_rp_open', JSON.stringify({ ...open })) } catch {}
}

/* ── 1. Rename / export / share ── */
const renaming = ref(false)
const renameVal = ref('')
const renameRef = ref(null)
function startRename() {
  renameVal.value = chat.value.title
  renaming.value = true
  nextTick(() => { renameRef.value?.focus(); renameRef.value?.select() })
}
async function commitRename() {
  if (!renaming.value) return
  renaming.value = false
  const t = renameVal.value.trim()
  if (t && t !== chat.value.title) await chatStore.renameChat(chat.value.id, t)
}

function handleExport() {
  const c = chat.value
  if (!c) return
  const body = realMessages.value
    .filter(m => m.content)
    .map(m => `**${m.role === 'user' ? 'You' : 'KinyaBot'}**\n\n${m.content}`)
    .join('\n\n---\n\n')
  const text = `# ${c.title}\n\n_Exported ${new Date().toLocaleString()}_\n\n${body}\n`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }))
  a.download = `${c.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'chat'}.md`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

const shared = ref(false)
async function handleShare() {
  const text = `Check out my KinyaBot conversation: "${chat.value?.title}"`
  if (navigator.share) {
    await navigator.share({ title: 'KinyaBot', text }).catch(() => {})
    return
  }
  await navigator.clipboard.writeText(text).catch(() => {})
  shared.value = true
  setTimeout(() => (shared.value = false), 1600)
}

function relTime(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(date).toLocaleDateString()
}

/* ── 2. Code blocks from the conversation ── */
const EXT = { javascript: 'js', typescript: 'ts', python: 'py', html: 'html', css: 'css', java: 'java', cpp: 'cpp', c: 'c', bash: 'sh', shell: 'sh', json: 'json', sql: 'sql', ruby: 'rb', php: 'php', go: 'go', rust: 'rs', kotlin: 'kt', swift: 'swift', yaml: 'yml', markdown: 'md' }
const codeBlocks = computed(() => {
  const out = []
  for (const m of realMessages.value) {
    if (!m.content || m._streaming) continue
    const re = /```([\w+#.-]*)[^\n]*\n([\s\S]*?)```/g
    let match, i = 0
    while ((match = re.exec(m.content))) {
      const code = match[2].replace(/\n$/, '')
      if (!code.trim()) continue
      const lang = (match[1] || 'text').toLowerCase()
      out.push({
        key: `${m.id}-${i++}`, msgId: m.id, lang, code,
        lines: code.split('\n').length,
        preview: (code.split('\n').find(l => l.trim()) || '').trim().slice(0, 90),
      })
    }
  }
  return out.reverse() // newest first
})

const copiedKey = ref('')
async function copyCode(b) {
  try { await navigator.clipboard.writeText(b.code) } catch { return }
  copiedKey.value = b.key
  setTimeout(() => { if (copiedKey.value === b.key) copiedKey.value = '' }, 1500)
}
function downloadCode(b) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([b.code], { type: 'text/plain' }))
  a.download = `kinyabot-snippet.${EXT[b.lang] || 'txt'}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

function jumpTo(id) {
  const el = document.getElementById(`msg-${id}`)
  if (!el) return
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
  el.classList.remove('kb-flash'); void el.offsetWidth; el.classList.add('kb-flash')
  setTimeout(() => el.classList.remove('kb-flash'), 1600)
  if (window.innerWidth <= 900) emit('close')
}

/* ── 3. Files & attachments ── */
function fmtSize(n) {
  if (!n) return ''
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`
}
const files = computed(() => {
  const out = []
  for (const m of realMessages.value) {
    const list = m.attachments?.length ? m.attachments : (m.file_url ? [{ url: m.file_url, kind: m.message_type === 'image' ? 'image' : 'document', name: m.file_url.split('/').pop() }] : [])
    list.forEach((a, i) => out.push({
      key: `${m.id}-f${i}`, msgId: m.id, url: a.url, kind: a.kind || 'document',
      name: a.name || 'Attachment',
      meta: [a.pages ? `${a.pages} pages` : '', fmtSize(a.size)].filter(Boolean).join(' · ') || (a.kind === 'audio' ? 'Audio' : 'Document'),
    }))
  }
  return out.reverse()
})
const imageFiles = computed(() => files.value.filter(f => f.kind === 'image'))
const otherFiles = computed(() => files.value.filter(f => f.kind !== 'image'))

const thumbs = reactive({})
watch(imageFiles, async (list) => {
  for (const f of list) {
    if (thumbs[f.key] !== undefined) continue
    thumbs[f.key] = ''
    const url = await loadAttachmentUrl(f.url)
    thumbs[f.key] = url || ''
  }
}, { immediate: true })

function download(f) { downloadAttachment(f.url, f.name) }

/* ── 4. Per-chat settings ── */
const LANGS = [
  { id: 'en', label: 'English' }, { id: 'rw', label: 'Kinyarwanda' }, { id: 'fr', label: 'Français' },
  { id: 'sw', label: 'Kiswahili' }, { id: 'es', label: 'Español' }, { id: 'de', label: 'Deutsch' },
  { id: 'ar', label: 'العربية' }, { id: 'zh', label: '中文' },
]
const STYLES = [
  { id: 'concise', label: 'Concise' }, { id: 'balanced', label: 'Balanced' },
  { id: 'detailed', label: 'Detailed' }, { id: 'code', label: 'Code-first' },
]
const prefs = computed(() => (chat.value ? chatStore.getPrefs(chat.value.id) : { lang: '', style: '' }))
function setPref(patch) { if (chat.value) chatStore.setPrefs(chat.value.id, patch) }

/* ── 5. Usage ── */
const usage = ref({ today: 0, daily_limit: 50, remaining: 50 })
const usagePct = computed(() => Math.min(100, Math.round((usage.value.today / (usage.value.daily_limit || 50)) * 100)))
async function fetchUsage() {
  try {
    const { data } = await api.get('/usage')
    usage.value = { today: data.today || 0, daily_limit: data.daily_limit || 50, remaining: Math.max(0, data.remaining ?? 50) }
  } catch {}
}
onMounted(fetchUsage)
watch(() => chatStore.sending, (busy, was) => { if (was && !busy) fetchUsage() })

const chatTokens = computed(() => {
  const msgs = realMessages.value
  const exact = msgs.some(m => m.tokens)
  const value = exact
    ? msgs.reduce((s, m) => s + (m.tokens || 0), 0)
    : Math.round(msgs.reduce((s, m) => s + (m.content?.length || 0), 0) / 4)
  return { value, exact }
})
const fmt = (n) => (n || 0) >= 1000 ? `${((n || 0) / 1000).toFixed(1)}k` : String(n || 0)
</script>

<style scoped>
.right-panel {
  width: var(--right-w); min-width: var(--right-w);
  height: 100vh; height: 100dvh;
  background: var(--surface-sidebar);
  border-left: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;
  color: var(--text-2);
}
@media (min-width: 901px) { .right-panel { --right-w: 304px; } }
@media (max-width: 900px) {
  .right-panel {
    position: fixed; right: 0; top: 0; bottom: 0;
    width: min(330px, 90vw); min-width: 0; z-index: 80;
    box-shadow: var(--shadow-md);
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.rp-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 8px 18px; flex-shrink: 0; }
.rp-heading { font-size: 15px; font-weight: 600; color: var(--text-1); letter-spacing: -.01em; }
.rp-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: var(--r-sm); background: none; border: none; color: var(--icon); font-size: 14px; cursor: pointer; transition: background var(--t-fast), color var(--t-fast); }
.rp-icon:hover { background: var(--bg-hover); color: var(--icon-hover); }
.rp-icon.sm { width: 28px; height: 28px; font-size: 12.5px; }
.rp-icon .ok { color: var(--success); }

.rp-scroll { flex: 1; overflow-y: auto; padding: 4px 12px 16px; display: flex; flex-direction: column; gap: 6px; -webkit-overflow-scrolling: touch; }

/* Empty state */
.rp-empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 24px 28px; }
.rp-empty-ico { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: var(--brand-soft); color: var(--brand-text); font-size: 18px; margin-bottom: 4px; }
.rp-empty-state strong { color: var(--text-1); font-size: 14.5px; font-weight: 600; }
.rp-empty-state p { font-size: 13px; line-height: 1.5; color: var(--text-3); }

/* Chat card */
.rp-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 14px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 6px; }
.rp-title-row { min-height: 28px; display: flex; align-items: center; }
.rp-title { display: flex; align-items: center; gap: 8px; width: 100%; background: none; border: none; padding: 2px 4px; margin: -2px -4px; border-radius: var(--r-sm); color: var(--text-1); font-size: 15px; font-weight: 600; text-align: left; cursor: text; letter-spacing: -.01em; transition: background var(--t-fast); }
.rp-title span { flex: 1; min-width: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word; }
.rp-title i { font-size: 11px; color: var(--text-3); opacity: 0; transition: opacity var(--t-fast); }
.rp-title:hover { background: var(--bg-hover); }
.rp-title:hover i, .rp-title:focus-visible i { opacity: 1; }
.rp-title-input { width: 100%; padding: 5px 8px; background: var(--bg-input); border: 1px solid var(--brand); border-radius: var(--r-sm); color: var(--text-1); font-size: 15px; font-weight: 600; box-shadow: var(--focus-glow); }
.rp-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12.5px; color: var(--text-3); }
.rp-meta i { margin-right: 6px; font-size: 11px; }
.rp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 34px; border-radius: var(--r-sm); background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-1); font-size: 13px; font-weight: 500; cursor: pointer; transition: background var(--t-fast), border-color var(--t-fast); }
.rp-btn:hover:not(:disabled) { border-color: var(--border-strong); background: var(--bg-active); }
.rp-btn:disabled { opacity: .5; cursor: not-allowed; }
.rp-btn i { font-size: 12px; color: var(--icon); }

/* Sections */
.rp-sec { border-top: 1px solid var(--border-subtle); padding-top: 2px; }
.rp-sec:first-of-type { border-top: none; }
.rp-sec-head { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 6px; background: none; border: none; border-radius: var(--r-sm); color: var(--text-1); font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; transition: background var(--t-fast); }
.rp-sec-head:hover { background: var(--bg-hover); }
.rp-sec-head > i:first-child { width: 18px; text-align: center; font-size: 13.5px; color: var(--icon); }
.rp-sec-head span { flex: 1; }
.rp-count { font-style: normal; font-size: 11.5px; font-weight: 600; min-width: 20px; padding: 1px 7px; text-align: center; border-radius: 99px; background: var(--brand-soft); color: var(--brand-text); }
.chev { font-size: 11px; color: var(--text-3); transition: transform var(--t-base) var(--ease); }
.chev.closed { transform: rotate(-90deg); }
.rp-sec-body { padding: 2px 4px 12px; display: flex; flex-direction: column; gap: 8px; }
.rp-hint { display: flex; align-items: flex-start; gap: 10px; padding: 8px 4px; font-size: 13px; line-height: 1.45; color: var(--text-3); }
.rp-hint i { margin-top: 3px; color: var(--text-disabled); }
.rp-list { list-style: none; display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; }

/* Code items */
.code-item { background: var(--code-bg); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; transition: border-color var(--t-fast); }
.code-item:hover { border-color: var(--border-strong); }
.code-top { display: flex; align-items: center; gap: 8px; padding: 6px 6px 0 10px; }
.lang-chip { font-family: var(--font-mono); font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: var(--r-xs); background: var(--brand-soft); color: var(--brand-text); }
.code-lines { font-size: 11.5px; color: var(--text-3); }
.code-tools { margin-left: auto; display: flex; }
.code-preview { display: block; width: 100%; padding: 6px 10px 10px; background: none; border: none; text-align: left; cursor: pointer; }
.code-preview code { display: block; font-family: var(--font-mono); font-size: 12px; color: var(--code-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jump { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 11.5px; color: var(--text-3); transition: color var(--t-fast); }
.jump i { font-size: 10px; transition: transform var(--t-fast); }
.code-preview:hover .jump { color: var(--brand-text); }
.code-preview:hover .jump i { transform: translateX(2px); }

/* Files */
.thumb-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.thumb { aspect-ratio: 1; border-radius: var(--r-sm); overflow: hidden; background: var(--bg-card); border: 1px solid var(--border); display: grid; place-items: center; color: var(--text-disabled); cursor: pointer; padding: 0; transition: border-color var(--t-fast), transform var(--t-fast); }
.thumb:hover { border-color: var(--brand); transform: translateY(-1px); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.file-row { display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 8px; border-radius: var(--r); background: var(--bg-card); border: 1px solid var(--border); }
.file-ico { width: 30px; height: 30px; display: grid; place-items: center; border-radius: var(--r-sm); background: var(--brand-soft); color: var(--brand-text); font-size: 13px; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; background: none; border: none; text-align: left; cursor: pointer; padding: 0; }
.file-name { font-size: 13px; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-info small { font-size: 11.5px; color: var(--text-3); }

/* Settings */
.field-label { font-size: 12.5px; font-weight: 500; color: var(--text-3); margin-top: 2px; }
.select-wrap { position: relative; }
.rp-select { width: 100%; height: 36px; padding: 0 32px 0 12px; appearance: none; -webkit-appearance: none; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--r-sm); color: var(--text-1); font-size: 13.5px; cursor: pointer; transition: border-color var(--t-fast), box-shadow var(--t-fast); }
.rp-select:hover { border-color: var(--border-strong); }
.rp-select:focus-visible { border-color: var(--brand); box-shadow: var(--focus-glow); outline: none; }
.select-wrap i { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--text-3); pointer-events: none; }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 3px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--r); }
.seg-btn { height: 30px; border-radius: var(--r-sm); background: none; border: none; color: var(--text-2); font-size: 12.5px; font-weight: 500; cursor: pointer; transition: background var(--t-fast), color var(--t-fast); }
.seg-btn:hover { color: var(--text-1); }
.seg-btn.on { background: var(--brand-soft); color: var(--brand-text); box-shadow: inset 0 0 0 1px var(--brand-ring); }
.rp-note { font-size: 12px; line-height: 1.45; color: var(--text-3); }

/* Usage */
.stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r); padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.stat strong { font-size: 18px; font-weight: 600; color: var(--text-1); font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
.stat small { font-size: 11.5px; color: var(--text-3); line-height: 1.3; }
.usage-line { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--text-3); margin-top: 4px; }
.pct { color: var(--text-2); font-variant-numeric: tabular-nums; }
.bar { height: 5px; border-radius: 99px; background: var(--border); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: inherit; background: var(--gradient-brand); transition: width var(--t-slow) var(--ease); }
.bar i.warn { background: var(--warning); }

@media (prefers-reduced-motion: reduce) { .thumb, .jump i, .chev { transition: none; } }
</style>
