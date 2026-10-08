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
        <AnimatedIcon icon="fas fa-triangle-exclamation" animation="shake" :active="true" />
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
      <AnimatedIcon icon="fas fa-circle-info" animation="fade-in" />
      <span>{{ message.content }}</span>
    </div>
  </div>

  <!-- Normal message -->
  <div v-else class="msg-row" :class="message.role">
    <div v-if="message.role==='assistant'" class="bot-avatar">
      <img src="/logo.png" alt="KinyaBot" />
    </div>

    <div class="bubble-col" :class="message.role">
      <div v-if="message.role==='assistant'" class="ai-name">KinyaBot</div>
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

      <!-- Inline edit composer (§17/§22): text + attachment keep/remove/add -->
      <div v-if="isEditing" class="edit-composer" @keydown.esc.prevent="cancelEdit">
        <div v-if="editAttachments.length" class="ec-atts">
          <div v-for="att in editAttachments" :key="att.url" class="ec-att" :class="{ removed: att.removed, 'is-img': att.kind === 'image' }">
            <img v-if="att.kind === 'image'" :src="att.preview" class="ec-att-thumb" :alt="att.name" />
            <span v-else class="ec-att-ic"><i :class="att.icon"></i></span>
            <span class="ec-att-name">{{ att.name }}</span>
            <button class="ec-att-x" :title="att.removed ? 'Keep attachment' : 'Remove attachment'"
              :aria-label="att.removed ? 'Keep attachment' : 'Remove attachment'"
              @click="att.removed = !att.removed">
              <i :class="att.removed ? 'fas fa-rotate-left' : 'fas fa-xmark'"></i>
            </button>
          </div>
          <label class="ec-att-add" title="Add a file">
            <i :class="editUploading ? 'fas fa-spinner fa-spin' : 'fas fa-plus'"></i>
            <input type="file" multiple hidden :accept="EDIT_ACCEPT" @change="onEditFiles" :disabled="editUploading" />
          </label>
        </div>
        <textarea
          ref="editTaRef"
          v-model="editDraft"
          class="ec-textarea"
          rows="2"
          :disabled="editBusy"
          aria-label="Edit your message"
          @input="resizeEditTa"
          @keydown.enter.exact.prevent="saveEdit"
        ></textarea>
        <div v-if="editNotice" class="ec-notice" role="alert"><i class="fas fa-triangle-exclamation"></i> {{ editNotice }}</div>
        <div class="ec-hint"><i class="fas fa-circle-info"></i> Sending the edit regenerates the response.</div>
        <div class="ec-actions">
          <button class="ec-btn ghost" @click="cancelEdit" :disabled="editBusy">Cancel</button>
          <button class="ec-btn" @click="saveEdit" :disabled="editBusy || (!editDraft.trim() && !editKeptCount && !editNewFiles.length)">
            <i v-if="editBusy" class="fas fa-spinner fa-spin"></i>
            {{ editBusy ? 'Saving…' : 'Save & resend' }}
          </button>
        </div>
      </div>

      <!-- Bubble content -->
      <div v-else class="bubble" :class="[message.role, {streaming: message._streaming, pending: message._pending}]" :id="`msg-${message.id}`">
        <div class="content" :class="{ prose: message.role==='assistant', 'user-text': message.role==='user' }"
          v-html="rendered"></div>
        <!-- Thinking indicator while the first tokens arrive -->
        <div v-if="message._streaming && !message.content" class="thinking">
          <AnimatedIcon icon="fas fa-sparkles" animation="thinking" :active="message._streaming && !message.content" />
          <span class="thinking-label">KinyaBot is thinking…</span>
        </div>
        <!-- Streaming cursor -->
        <span v-else-if="message._streaming" class="stream-cursor"></span>
      </div>

      <section
        v-if="message.role === 'assistant' && (message._streaming ? isCodingTask : generatedFiles.length > 0)"
        class="coding-activity"
        :class="{ complete: !message._streaming }"
      >
        <button
          class="coding-activity-toggle"
          type="button"
          :aria-expanded="activityOpen"
          @click="activityOpen = !activityOpen"
        >
          <span class="coding-activity-status">
            <i :class="message._streaming ? 'fas fa-spinner fa-spin' : 'fas fa-check'"></i>
          </span>
          <span class="coding-activity-title">
            <strong>{{ message._streaming ? 'Working on your code' : `Created ${generatedFiles.length} ${generatedFiles.length === 1 ? 'file' : 'files'}` }}</strong>
            <small>{{ message._streaming ? 'Generating the requested code' : 'Downloadable files are ready' }}</small>
          </span>
          <i class="fas fa-chevron-down coding-activity-chevron" :class="{ open: activityOpen }"></i>
        </button>
        <div v-if="activityOpen" class="coding-activity-details">
          <div v-if="message._streaming" class="coding-activity-row">
            <i class="fas fa-code"></i>
            <span>Generating project files</span>
            <span class="activity-state">In progress</span>
          </div>
          <div v-for="file in generatedFiles" :key="file.key" class="coding-activity-row">
            <i class="fas fa-file-code"></i>
            <span>{{ file.name }}</span>
            <span class="activity-state">{{ message._streaming ? 'Ready' : 'Created' }}</span>
          </div>
          <div v-if="message._streaming" class="coding-activity-row">
            <i class="fas fa-box-archive"></i>
            <span>Preparing downloadable files</span>
            <span class="activity-state pending">After generation</span>
          </div>
        </div>
      </section>

      <div v-if="generatedFiles.length" class="generated-file-card">
        <button class="generated-file-info" type="button" @click="$emit('open-artifact')" :aria-label="`Open ${generatedTitle}`">
          <span class="generated-file-icon"><i :class="generatedFiles.length > 1 ? 'fas fa-box-archive' : 'fas fa-file-code'"></i></span>
          <span class="generated-file-copy">
            <strong>{{ generatedTitle }}</strong>
            <small>{{ generatedFiles.length > 1 ? `ZIP · ${generatedFiles.length} files` : `${generatedFiles[0].language} source file` }}</small>
          </span>
        </button>
        <button class="generated-file-download" type="button" :disabled="downloadingFiles" @click="downloadGeneratedFiles">
          <i :class="downloadingFiles ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
          {{ downloadingFiles ? 'Preparing…' : 'Download' }}
        </button>
      </div>

      <div v-if="artifactError" class="artifact-error" role="alert">{{ artifactError }}</div>

      <!-- Cancelled marker -->
      <div v-if="message._status === 'cancelled' && message.role === 'assistant'" class="cancelled-note">
        <AnimatedIcon icon="fas fa-ban" animation="fade-in" /> Generation stopped
      </div>

      <!-- Source references — only when the backend actually knows them -->
      <div v-if="message.sources?.length" class="sources-line">
        <AnimatedIcon icon="fas fa-file-shield" />
        <span>Source: {{ message.sources.join(', ') }}</span>
      </div>

      <!-- Actions -->
      <div class="actions" :class="[message.role, { 'always-on': message._status === 'failed' || ttsActive }]">
        <!-- Copy -->
        <button class="act-btn" :class="{success: copied}" @click="handleCopy" :title="copied?'Copied!':'Copy message'" :aria-label="copied?'Copied':'Copy message'">
          <AnimatedIcon :icon="copied ? 'fas fa-check' : 'fas fa-copy'" :animation="copied ? 'draw-check' : 'subtle-hover'" :active="copied" />
        </button>

        <!-- Retry for failed user sends -->
        <button v-if="message.role==='user' && message._status === 'failed'" class="act-btn retry-act" @click="$emit('retry', message.id)" title="Retry send" aria-label="Retry send">
          <AnimatedIcon icon="fas fa-rotate-right" animation="subtle-hover" />
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
            <AnimatedIcon v-if="ttsState === 'loading'" icon="fas fa-spinner" animation="spin" :active="true" />
            <AnimatedIcon v-else-if="ttsState === 'playing'" icon="fas fa-pause" animation="subtle-hover" />
            <AnimatedIcon v-else icon="fas fa-volume-high" animation="subtle-hover" />
          </button>
          <!-- Stop audio while playing -->
          <button v-if="ttsState === 'playing'" class="act-btn" @click="stopListen" title="Stop audio" aria-label="Stop audio">
            <AnimatedIcon icon="fas fa-stop" animation="press" />
          </button>
          <!-- Regenerate (last assistant message only) -->
          <button v-if="isLast" class="act-btn" @click="$emit('regenerate')" title="Regenerate response" aria-label="Regenerate response" :aria-busy="regenBusy">
            <AnimatedIcon icon="fas fa-rotate-right" animation="regenerate" :active="regenBusy" />
          </button>
          <!-- Like -->
          <button class="act-btn" :class="{liked: liked===true}" @click="handleLike(true)" title="Helpful" aria-label="Helpful" :aria-pressed="liked===true">
            <AnimatedIcon :icon="liked===true ? 'fas fa-thumbs-up' : 'far fa-thumbs-up'" animation="press" />
          </button>
          <!-- Unlike -->
          <button class="act-btn" :class="{disliked: liked===false}" @click="handleLike(false)" title="Not helpful" aria-label="Not helpful" :aria-pressed="liked===false">
            <AnimatedIcon :icon="liked===false ? 'fas fa-thumbs-down' : 'far fa-thumbs-down'" animation="press" />
          </button>
          <!-- Share -->
          <button class="act-btn" @click="handleShare" title="Share" aria-label="Share response">
            <AnimatedIcon icon="fas fa-share-nodes" animation="subtle-hover" />
          </button>
        </template>

        <!-- Edit (user messages, §17) -->
        <button v-if="canEdit" class="act-btn" @click="startEdit" title="Edit message" aria-label="Edit message">
          <AnimatedIcon icon="fas fa-pen" animation="subtle-hover" />
        </button>

        <!-- Delete -->
        <button class="act-btn danger" @click="confirmDelete=true" title="Delete" aria-label="Delete message">
          <i class="fas fa-trash-can"></i>
        </button>

        <span class="msg-time">{{ fmtTime }}</span>
      </div>

      <!-- Response versions (§20): ‹ 2/3 › -->
      <div v-if="versionInfo && versionInfo.count > 1" class="version-nav" role="navigation" aria-label="Response versions">
        <button class="vn-btn" :disabled="versionInfo.position <= 1" @click="$emit('version', -1)" aria-label="Previous response">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="vn-pos">{{ versionInfo.position }} / {{ versionInfo.count }}</span>
        <button class="vn-btn" :disabled="versionInfo.position >= versionInfo.count" @click="$emit('version', 1)" aria-label="Next response">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- Edited marker (honest history, §18) -->
      <div v-if="message.role === 'user' && (message.edit_history?.length || message._edited)" class="edited-marker">
        <i class="fas fa-pen"></i> edited
      </div>

      <!-- TTS honest error -->
      <transition name="fade">
        <div v-if="ttsError" class="tts-error">{{ ttsError }}</div>
      </transition>

      <!-- Feedback text after like/dislike -->
      <transition name="fade">
        <div v-if="feedbackMsg" class="feedback-msg" aria-live="polite">{{ feedbackMsg }}</div>
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
import { useAuthStore } from '../stores/auth'
import api from '../api'
import AnimatedIcon from './AnimatedIcon.vue'
import MessageAttachment from './MessageAttachment.vue'
import { register as registerAudio, unregister as unregisterAudio } from '../utils/audio'
import { renderMarkdown } from '../utils/markdown'
import { downloadCodeFiles, extractCodeFiles, withoutCodeFences } from '../utils/codeArtifacts'

const props = defineProps({
  message: Object,
  isLast: { type: Boolean, default: false },       // last assistant message → regenerate
  regenBusy: { type: Boolean, default: false },
  isCodingTask: { type: Boolean, default: false },
  artifactName: { type: String, default: 'kinyabot-project' }
})
const emit = defineEmits(['delete', 'copy', 'retry', 'regenerate', 'edit-save', 'version', 'open-artifact'])

const auth = useAuthStore()
const userInitial = computed(() => auth.user?.username?.[0]?.toUpperCase() || 'U')

const liked = ref(null) // true=liked, false=disliked, null=neutral
const copied = ref(false)
let copyTimer = null
let feedbackTimer = null
const confirmDelete = ref(false)
const feedbackMsg = ref('')

/* ── Message editing (§17/§22) ──
   Inline composer replaces the user bubble. Existing attachments can
   be kept or removed; new files attach through the picker. Saving
   emits to the parent → store PATCH → branch reset → regeneration. */
const EDIT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.txt,.md,.csv,.json,.docx,.py,.js,.ts,.html,.css,.xml,.yaml,.yml'
const EDIT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const EDIT_IMAGE_MAX = 4 * 1024 * 1024
const EDIT_DOC_MAX = 15 * 1024 * 1024
const EDIT_DOC_EXTS = /\.(pdf|txt|md|csv|json|docx|py|js|ts|html|css|xml|yaml|yml)$/i
const EDIT_MAX_TOTAL = 4
const isEditing = ref(false)
const editDraft = ref('')
const editBusy = ref(false)
const editAttachments = ref([])   // { url, name, kind, icon, preview, removed }
const editNewFiles = ref([])      // File[]
const editTaRef = ref(null)
const editNotice = ref('')
const editUploading = ref(false)

const canEdit = computed(() =>
  props.message.role === 'user' &&
  !props.message._pending &&
  props.message._status !== 'failed' &&
  !props.message._error &&
  !isEditing.value
)

const editKeptCount = computed(() => editAttachments.value.filter(a => !a.removed).length)

function startEdit() {
  if (!canEdit.value) return
  editDraft.value = props.message.content || ''
  editNewFiles.value = []
  editNotice.value = ''
  editAttachments.value = (props.message.attachments || []).map(a => ({
    url: a.url,
    name: a.name || 'attachment',
    kind: a.kind,
    icon: a.kind === 'image' ? 'fas fa-image' : (String(a.name || '').toLowerCase().endsWith('.pdf') ? 'fas fa-file-pdf' : 'fas fa-file-lines'),
    preview: a.kind === 'image' ? a.url : null,
    removed: false,
  }))
  isEditing.value = true
  setTimeout(() => { editTaRef.value?.focus(); resizeEditTa() }, 30)
}

function cancelEdit() {
  isEditing.value = false
  editDraft.value = ''
  editNewFiles.value = []
  editAttachments.value = []
}

function resizeEditTa() {
  const el = editTaRef.value; if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 180) + 'px'
}

function onEditFiles(e) {
  const picked = Array.from(e.target.files || [])
  e.target.value = ''
  for (const f of picked) {
    const isImg = (f.type || '').startsWith('image/')
    if (isImg) {
      if (!EDIT_IMAGE_TYPES.includes(f.type)) { editNotice.value = `"${f.name}" is not a supported image. Use JPG, PNG, GIF or WebP.`; continue }
      if (f.size > EDIT_IMAGE_MAX) { editNotice.value = `"${f.name}" is too large. Maximum image size is 4 MB.`; continue }
    } else {
      if (!EDIT_DOC_EXTS.test(f.name)) { editNotice.value = `"${f.name}" is a file type KinyaBot can't read yet.`; continue }
      if (f.size > EDIT_DOC_MAX) { editNotice.value = `"${f.name}" is too large. Maximum document size is 15 MB.`; continue }
    }
    if (editKeptCount.value + editNewFiles.value.length >= EDIT_MAX_TOTAL) {
      editNotice.value = `You can attach up to ${EDIT_MAX_TOTAL} files per message.`; break
    }
    editNewFiles.value = [...editNewFiles.value, f]
    editAttachments.value = [...editAttachments.value, {
      url: `__new__${editNewFiles.value.length - 1}__${f.name}`,
      file: f,
      name: f.name,
      kind: isImg ? 'image' : 'document',
      icon: isImg ? 'fas fa-image' : (f.name.toLowerCase().endsWith('.pdf') ? 'fas fa-file-pdf' : 'fas fa-file-lines'),
      preview: isImg ? URL.createObjectURL(f) : null,
      removed: false,
      isNew: true,
    }]
  }
}

async function saveEdit() {
  if (editBusy.value) return
  const content = editDraft.value.trim()
  const keptUrls = editAttachments.value.filter(a => !a.removed && !a.isNew).map(a => a.url)
  const newFiles = editAttachments.value.filter(a => !a.removed && a.isNew && a.file).map(a => a.file)
  const hadKept = editAttachments.value.some(a => !a.isNew)
  if (!content && !keptUrls.length && !newFiles.length) return
  editBusy.value = true
  try {
    await emit('edit-save', {
      content,
      keepAttachments: hadKept ? keptUrls : null,
      newFiles,
    })
    isEditing.value = false
  } finally {
    editBusy.value = false
  }
}

/* ── Response versions (§20) ── */
const versionInfo = computed(() => {
  if (props.message.role !== 'assistant' || props.message._error || props.message._streaming) return null
  const count = Array.isArray(props.message.versions) ? props.message.versions.length : 0
  if (count < 2) return null
  const active = Number.isInteger(props.message.active_version) ? props.message.active_version : count - 1
  return { count, position: active + 1 }
})
const lightboxImg = ref(null)
const downloadingFiles = ref(false)
const artifactError = ref('')
const activityOpen = ref(true)

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
  const enhanced = addEmojiReactions(withoutCodeFences(props.message.content))
  return renderMarkdown(enhanced)
})

const generatedFiles = computed(() => {
  if (props.message.role !== 'assistant' || props.message._streaming || props.message._error || props.message._status === 'cancelled') return []
  return extractCodeFiles(props.message.content, props.message.id)
})
const generatedTitle = computed(() => generatedFiles.value.length > 1
  ? 'KinyaBot project files'
  : generatedFiles.value[0]?.name || 'Generated file'
)
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
  clearTimeout(copyTimer)
  clearTimeout(feedbackTimer)
})

async function handleCopy() {
  const text = props.message.content || ''
  try {
    await navigator.clipboard.writeText(text)
    feedbackMsg.value = ''
    clearTimeout(feedbackTimer)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
    emit('copy')
  } catch {
    copied.value = false
    showFeedback('Could not copy this response. Check clipboard permissions and try again.', 5000)
  }
}

function showFeedback(message, duration) {
  feedbackMsg.value = message
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => { feedbackMsg.value = '' }, duration)
}

function handleLike(val) {
  if (liked.value === val) { liked.value = null; feedbackMsg.value = ''; clearTimeout(feedbackTimer); return }
  liked.value = val
  showFeedback(val ? 'Marked as helpful.' : 'Marked as not helpful.', 3000)
}

async function handleShare() {
  const text = `KinyaBot AI Response:\n\n${props.message.content}`
  if (navigator.share) {
    try {
      await navigator.share({ title:'KinyaBot AI', text })
    } catch (err) {
      if (err?.name !== 'AbortError') showFeedback('Could not share this response. Please try again.', 5000)
    }
  } else {
    try {
      await navigator.clipboard.writeText(text)
      alert('Response copied to clipboard for sharing!')
    } catch {
      showFeedback('Could not copy this response for sharing. Check clipboard permissions and try again.', 5000)
    }
  }
}

async function downloadGeneratedFiles() {
  if (downloadingFiles.value) return
  downloadingFiles.value = true
  artifactError.value = ''
  try {
    await downloadCodeFiles(generatedFiles.value, props.artifactName)
  } catch {
    artifactError.value = 'The generated files could not be prepared. Please try downloading again.'
  } finally {
    downloadingFiles.value = false
  }
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
.user-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,var(--brand-strong),var(--accent-violet)); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; overflow:hidden; }
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
  color:var(--error); font-size:13.5px; max-width:480px;
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
.retry-btn:hover { border-color:rgba(99,102,241,.5); background:rgba(99,102,241,.12); }
.retry-btn i { font-size:11px; }
.retry-act { color:var(--blue) !important; }

/* Attachments stack */
.attach-previews { display:flex; flex-direction:column; gap:6px; align-items:flex-start; max-width:100%; }
.bubble-col.user .attach-previews { align-items:flex-end; }
.generated-file-card {
  display:flex; align-items:center; gap:10px; width:min(100%, 560px); min-height:72px;
  margin-top:10px; padding:10px 12px; border:1px solid var(--border-md);
  border-radius:14px; background:var(--bg-card); box-shadow:0 4px 16px rgba(0,0,0,.08);
}
.generated-file-info {
  display:flex; align-items:center; gap:12px; flex:1; min-width:0; padding:0;
  color:var(--text-1); text-align:left; background:none; border:0; cursor:pointer;
}
.generated-file-icon {
  display:grid; place-items:center; flex:0 0 42px; height:48px;
  border:1px solid var(--border); border-radius:10px; background:var(--bg-hover);
  color:var(--brand-text); font-size:18px;
}
.generated-file-copy { display:flex; flex-direction:column; gap:3px; min-width:0; }
.generated-file-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:600; }
.generated-file-copy small { color:var(--text-3); font-size:11.5px; text-transform:uppercase; }
.generated-file-download {
  display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px;
  padding:0 12px; border:0; border-radius:9px; background:var(--bg-hover);
  color:var(--text-1); font:inherit; font-size:12px; font-weight:600; cursor:pointer;
}
.generated-file-download:hover:not(:disabled) { background:var(--bg-active); }
.generated-file-download:disabled { opacity:.65; cursor:wait; }
.artifact-error { margin-top:4px; color:var(--error); font-size:12px; }
.coding-activity {
  width:min(100%, 560px); margin-top:8px; overflow:hidden;
  border:1px solid var(--border-md); border-radius:12px; background:var(--bg-card);
}
.coding-activity-toggle {
  display:flex; align-items:center; gap:10px; width:100%; min-height:58px; padding:9px 12px;
  background:transparent; border:0; color:var(--text-1); text-align:left; cursor:pointer;
}
.coding-activity-status { display:grid; place-items:center; width:26px; height:26px; border-radius:50%; background:var(--brand-soft); color:var(--brand-text); font-size:12px; }
.coding-activity.complete .coding-activity-status { background:rgba(34,197,94,.12); color:var(--success); }
.coding-activity-title { display:flex; flex:1; flex-direction:column; gap:2px; min-width:0; }
.coding-activity-title strong { font-size:13px; font-weight:600; }
.coding-activity-title small { color:var(--text-3); font-size:11.5px; }
.coding-activity-chevron { color:var(--text-3); font-size:11px; transition:transform .18s ease; }
.coding-activity-chevron.open { transform:rotate(180deg); }
.coding-activity-details { padding:3px 12px 10px 22px; border-top:1px solid var(--border-subtle); }
.coding-activity-row { display:flex; align-items:center; gap:9px; min-height:34px; color:var(--text-2); font-size:12px; }
.coding-activity-row > i { width:14px; color:var(--text-3); font-size:11px; }
.coding-activity-row > span:first-of-type { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.activity-state { color:var(--success); font-size:10.5px; white-space:nowrap; }
.activity-state.pending { color:var(--text-3); }

/* Thinking indicator */
.thinking { display:flex; align-items:center; gap:5px; padding:6px 0; }
.thinking-label { font-size:12.5px; color:var(--text-3); margin-left:4px; font-style:italic; }

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
.sources-line i { color:var(--brand-text); font-size:10px; flex-shrink:0; }
.sources-line span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* TTS */
.tts-error { font-size:11.5px; color:var(--error); margin-top:3px; }
.act-btn.active { color:var(--brand-text) !important; background:rgba(99,102,241,.14); }
.actions.always-on { opacity:1; }
  
/* System message */
.msg-row.system-msg { justify-content:center; }
.system-bubble {
  display:flex; align-items:center; gap:8px;
  padding:8px 14px;
  background:rgba(99,102,241,.08); border:1px solid rgba(99,102,241,.2);
  border-radius:99px; color:var(--brand-text); font-size:12.5px;
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
.act-btn.success { color:var(--success) !important; }
.act-btn.liked { color:#4285f4 !important; }
.act-btn.disliked { color:var(--error) !important; }
.act-btn.danger:hover { background:rgba(242,139,130,.12); color:var(--error); }
.msg-time { font-size:11px; color:var(--text-3); margin-left:4px; }

.feedback-msg { font-size:11.5px; color:var(--text-2); padding:3px 4px; animation:fadeUp .2s ease; font-style:italic; }

/* Delete confirm */
.del-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:999; backdrop-filter:blur(4px); }
.del-modal { width:300px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-lg); padding:1.25rem; animation:fadeUp .2s ease; }
.del-modal h4 { font-size:14px; font-weight:600; margin-bottom:.6rem; display:flex; align-items:center; gap:8px; color:var(--error); }
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
@media(max-width:600px){.generated-file-card{gap:6px;padding:8px}.generated-file-download{padding:0 9px;font-size:11px}}

.ai-name { display:none; }

/* ═══════════ MOBILE (≤768px): chat bubbles ═══════════ */
@media(max-width:768px){
  .msg-row { gap:7px; padding:4px 0; animation:fadeUp .3s ease both; }
  .bot-avatar { width:28px; height:28px; background:var(--accent-solid); border:none; padding:5px; }
  .user-avatar { display:none; }
  .bubble-col { max-width:calc(100% - 38px) !important; }
  .bubble-col.user { max-width:86% !important; margin-left:auto; }
  .ai-name { display:block; font-size:11px; font-weight:600; color:var(--purple); margin:1px 0 4px 3px; }

  .bubble.assistant { background:var(--bg-card) !important; border:1px solid var(--border) !important; border-radius:5px 18px 18px 18px; padding:11px 14px; }
  .bubble.user { background:var(--accent-solid) !important; border:none !important; border-radius:18px 18px 5px 18px; padding:11px 15px; }
  .bubble.user .user-text, .bubble.user .content { color:#fff !important; }

  .typing-bubble { border-radius:5px 18px 18px 18px; padding:12px 16px; }
  .error-bubble { border-radius:5px 16px 16px 16px; }

  .actions { opacity:1; gap:5px; margin-top:6px; padding-left:1px; }
  .act-btn { width:30px; height:30px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border); color:var(--purple); font-size:12px; }
  .act-btn:active { transform:scale(.88); }
  .act-btn.danger { color:var(--text-3); }
  .msg-time { display:none; }
  .actions.always-on.user, .actions.user:has(.retry-act) { display:flex; }
  .version-nav { margin-left:auto; }
}

/* ── Inline edit composer (§17) ── */
.ec-notice { display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--red, #ef4444); }
.edit-composer {
  display:flex; flex-direction:column; gap:8px;
  width:100%; max-width:560px; min-width:240px;
  background:var(--bg-card); border:1px solid var(--brand);
  border-radius:16px; padding:10px; box-shadow:var(--focus-glow, 0 0 0 3px rgba(99,102,241,.08));
  animation:fadeIn .18s ease both;
}
.ec-atts { display:flex; flex-wrap:wrap; gap:6px; }
.ec-att {
  position:relative; display:flex; align-items:center; gap:6px;
  padding:4px 26px 4px 4px; background:var(--bg-input);
  border:1px solid var(--border-md); border-radius:10px; max-width:200px;
}
.ec-att.removed { opacity:.42; filter:grayscale(.7); }
.ec-att-thumb { width:32px; height:32px; object-fit:cover; border-radius:6px; }
.ec-att-ic { width:30px; height:30px; border-radius:6px; background:var(--bg-hover); display:flex; align-items:center; justify-content:center; color:var(--brand-text); font-size:12px; }
.ec-att-name { font-size:11.5px; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px; }
.ec-att-x {
  position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%;
  background:var(--bg-active, #333); border:1px solid var(--border-md); color:var(--text-2);
  font-size:9px; cursor:pointer; display:flex; align-items:center; justify-content:center;
}
.ec-att-x:hover { background:var(--red, #ef4444); color:#fff; }
.ec-att-add {
  display:flex; align-items:center; justify-content:center; width:32px; height:32px;
  border-radius:8px; border:1px dashed var(--border-md); color:var(--text-3);
  cursor:pointer; font-size:12px; transition:all .15s;
}
.ec-att-add:hover { border-color:var(--brand); color:var(--brand-text); }
.ec-textarea {
  width:100%; min-height:56px; max-height:180px; resize:none;
  background:var(--bg-input); border:1px solid var(--border-md); border-radius:10px;
  padding:10px 12px; color:var(--text-1); font-size:14px; line-height:1.45; outline:none;
  font-family:inherit;
}
.ec-textarea:focus { border-color:var(--brand); }
.ec-hint { display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--text-3); }
.ec-actions { display:flex; justify-content:flex-end; gap:8px; }
.ec-btn {
  height:32px; padding:0 14px; border-radius:8px; border:1px solid var(--brand);
  background:var(--brand-soft, rgba(99,102,241,.14)); color:var(--brand-text);
  font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;
  transition:filter .15s, transform .15s;
}
.ec-btn:hover:not(:disabled) { filter:brightness(1.12); }
.ec-btn:active:not(:disabled) { transform:scale(.97); }
.ec-btn:disabled { opacity:.5; cursor:default; }
.ec-btn.ghost { background:transparent; border-color:var(--border-md); color:var(--text-2); }
.ec-btn.ghost:hover:not(:disabled) { background:var(--bg-hover); color:var(--text-1); }

/* ── Version navigator (§20) ── */
.version-nav { display:flex; align-items:center; gap:6px; margin-top:2px; }
.vn-btn {
  width:22px; height:22px; border-radius:6px; border:none; background:none;
  color:var(--text-3); font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .15s;
}
.vn-btn:hover:not(:disabled) { background:var(--bg-hover); color:var(--text-1); }
.vn-btn:disabled { opacity:.35; cursor:default; }
.vn-pos { font-size:11.5px; color:var(--text-3); font-variant-numeric:tabular-nums; min-width:34px; text-align:center; }

/* ── Edited marker (§18) ── */
.edited-marker {
  display:inline-flex; align-items:center; gap:4px; margin-top:3px;
  font-size:10.5px; color:var(--text-3); opacity:.85;
}
.actions.user + .edited-marker { align-self:flex-end; }
</style>

<style>
/* Global styles for code blocks rendered inside v-html */
.code-block { border-radius:8px; overflow:hidden; border:1px solid var(--border); background:var(--code-bg); margin:.8rem 0; }
.code-header { display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:var(--code-header); border-bottom:1px solid var(--border-subtle); }
.code-lang { color:var(--brand-text); font-size:11.5px; font-weight:600; font-family:var(--font-mono); }
.code-actions { display:flex; gap:6px; }
.copy-code-btn,.download-code-btn { background:none; border:none; color:var(--text-2,var(--text-3)); font-size:11px; cursor:pointer; padding:3px 8px; border-radius:4px; transition:all .2s; display:flex; align-items:center; gap:4px; font-family:inherit; }
.copy-code-btn:hover,.download-code-btn:hover { background:var(--bg-hover); color:var(--text-1); }
.hljs { background:var(--code-bg)!important; padding:14px 16px!important; font-size:13.5px!important; display:block; overflow-x:auto; }
</style>
