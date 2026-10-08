<template>
  <div class="input-area" :class="{ centered }">
    <!-- Client-side error notice (invalid / too-large file, STT failure) -->
    <transition name="fade">
      <div v-if="notice" class="inline-notice" role="alert">
        <AnimatedIcon icon="fas fa-triangle-exclamation" animation="shake" :trigger="noticeTrigger" />
        <span>{{ notice }}</span>
        <button class="in-x" @click="notice=''" aria-label="Dismiss notice"><AnimatedIcon icon="fas fa-xmark" animation="press" /></button>
      </div>
    </transition>

    <!-- Attachment previews (multiple, §9/§13) -->
    <transition name="fade">
      <div v-if="attachments.length" class="att-row" aria-label="Attachments">
        <div v-for="att in attachments" :key="att.id" class="att-chip" :class="{ 'is-img': att.isImg }" :title="att.error || att.name">
          <template v-if="att.isImg">
            <img :src="att.url" class="attc-thumb" :alt="att.name" />
            <span class="attc-name">{{ att.name }}</span>
          </template>
          <template v-else>
            <span class="attc-ic"><i :class="att.icon"></i></span>
            <span class="attc-body">
              <span class="attc-name">{{ att.name }}</span>
              <small class="attc-size">{{ att.sizeLabel }}<b v-if="att.kindLabel"> · {{ att.kindLabel }}</b></small>
            </span>
          </template>
          <button class="attc-x" @click="removeAttachment(att.id)" :aria-label="`Remove ${att.name}`" title="Remove attachment">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>
    </transition>

    <div class="input-box" :class="{ focused, sending: disabled, 'has-text': !!(inputVal.trim() || attachments.length), 'has-suggestions': showSuggestions }">
      <!-- Voice input status -->
      <transition name="fade">
        <div v-if="isRec || transcribing" class="wave-bar">
          <div class="wave-info">
            <AnimatedIcon :icon="transcribing ? 'fas fa-spinner' : 'fas fa-microphone'" :animation="transcribing ? 'spin' : 'voice-listening'" :active="transcribing || isRec" style="color:var(--accent-cyan)" />
            <span v-if="transcribing">Transcribing your recording…</span>
            <template v-else>
              <span>Listening{{ recTime ? ` · ${recTime}` : '' }}</span>
              <span class="wave-hint">Press the mic again to transcribe</span>
            </template>
          </div>
        </div>
      </transition>

      <!-- Textarea -->
      <textarea
        ref="taRef"
        v-model="inputVal"
        class="chat-ta"
        :placeholder="placeholder"
        rows="1"
        :disabled="disabled"
        enterkeyhint="send"
        aria-label="Message KinyaBot"
        aria-autocomplete="list"
        aria-controls="prompt-suggestions"
        :aria-expanded="showSuggestions"
        :aria-activedescendant="showSuggestions ? `prompt-suggestion-${activeSuggestion}` : undefined"
        @focus="onFocus"
        @blur="focused=false"
        @paste="onPaste"
        @keydown.enter.exact.prevent="handleSuggestionEnter"
        @keydown.enter.shift.exact="() => {}"
        @keydown.down="moveSuggestion(1, $event)"
        @keydown.up="moveSuggestion(-1, $event)"
        @keydown.esc="dismissSuggestions"
        @input="resize"
      ></textarea>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="tl-left">
          <!-- Attach menu: 📎 → 🖼 Image / 📄 Document -->
          <div class="attach-wrap" ref="attachWrapEl" @keydown.esc="attachOpen=false">
            <button
              class="tb-btn"
              :class="{on: attachOpen}"
              @click="attachOpen=!attachOpen"
              aria-label="Attach a file"
              aria-haspopup="menu"
              :aria-expanded="attachOpen ? 'true' : 'false'"
              title="Attach a file"
            >
              <AnimatedIcon icon="fas fa-paperclip" animation="subtle-hover" />
              <span class="tb-label">Attach</span>
            </button>
            <transition name="pop">
              <div v-if="attachOpen" class="attach-menu" role="menu">
                <button class="am-item" role="menuitem" @click="pickFile('image')">
                  <AnimatedIcon icon="fas fa-image" animation="subtle-hover" />
                  <span>
                    <b>Image</b>
                    <small>JPG, PNG, GIF, WebP · up to 4 MB</small>
                  </span>
                </button>
                <button class="am-item" role="menuitem" @click="pickFile('document')">
                  <AnimatedIcon icon="fas fa-file-lines" animation="subtle-hover" />
                  <span>
                    <b>Document</b>
                    <small>PDF, DOCX, TXT, CSV, code · up to 15 MB</small>
                  </span>
                </button>
              </div>
            </transition>
            <input ref="fileRef" type="file" :accept="acceptFor(pickKind)" multiple @change="handleFile" hidden />
          </div>
          <button class="tb-btn" :class="{on: deepThink}" @click="deepThink=!deepThink" title="Deep Think" :aria-pressed="deepThink">
            <AnimatedIcon icon="fas fa-brain" animation="subtle-hover" />
            <span class="tb-label">Deep Think</span>
          </button>
        </div>
        <div class="tl-right">
          <button
            class="tb-ico"
            :class="{rec: isRec}"
            @click="toggleVoice"
            :disabled="transcribing"
            :aria-label="isRec ? 'Stop recording and transcribe' : 'Record voice message'"
            :title="isRec ? 'Stop and transcribe' : 'Voice input'"
          >
            <AnimatedIcon v-if="transcribing" icon="fas fa-spinner" animation="spin" :active="transcribing" />
            <AnimatedIcon v-else icon="fas fa-microphone" animation="voice-listening" :active="isRec" />
          </button>
          <button class="send-btn" :disabled="disabled || (!inputVal.trim() && !attachments.length)" @click="submit" aria-label="Send message" title="Send (Enter)">
            <AnimatedIcon v-if="disabled" icon="fas fa-spinner" animation="spin" :active="disabled" />
            <AnimatedIcon v-else icon="fas fa-paper-plane" animation="send" :trigger="sendTrigger" />
          </button>
        </div>
      </div>
      <div v-if="showSuggestions" id="prompt-suggestions" class="prompt-suggestions" role="listbox" aria-label="Prompt suggestions">
        <button
          v-for="(suggestion, index) in suggestions"
          :key="suggestion"
          :id="`prompt-suggestion-${index}`"
          class="prompt-suggestion"
          :class="{ selected: index === activeSuggestion }"
          type="button"
          role="option"
          :aria-selected="index === activeSuggestion"
          @mousedown.prevent
          @mouseenter="activeSuggestion = index"
          @click="selectSuggestion(suggestion)"
        >
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <span>{{ suggestion }}</span>
          <i v-if="index === activeSuggestion" class="fas fa-arrow-up-right-from-square suggestion-open" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <p v-if="!centered" class="disclaimer">KinyaBot may make mistakes. Verify important info. · POWERED BY AFASA</p>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import api from '../api'
import AnimatedIcon from './AnimatedIcon.vue'

const props = defineProps({
  disabled: Boolean,
  // Guest mode: keep the typed message in the composer when the
  // auth gate fires, so nothing the user wrote is ever lost.
  preserveOnSend: Boolean,
  // Text injected from outside (restored pending message / guest chips)
  injectedText: { type: String, default: '' },
  // File injected from outside (restored pending attachment — kept
  // in memory across the guest sign-in round-trip)
  injectedFile: { type: [Object, File], default: null },
  // Files injected from outside as a BATCH (drag & drop, §10) — the
  // parent hands over File[] and consumes the event afterwards.
  injectedFiles: { type: Array, default: null },
  // Centered hero mode (desktop empty state) — tighter chrome,
  // disclaimer hidden, the welcome layout provides spacing.
  centered: Boolean,
  suggestionsEnabled: { type: Boolean, default: true }
})
const emit  = defineEmits(['send', 'focus', 'files-consumed'])

const inputVal     = ref('')
const attachments  = ref([])   // { id, file, isImg, url, name, sizeLabel, kindLabel, icon, error }
const focused      = ref(false)
const deepThink    = ref(false)
const notice       = ref('')
const noticeTrigger = ref(0)
const sendTrigger = ref(0)
const fileTrigger = ref(0)
const taRef        = ref(null)
const fileRef      = ref(null)
const activeSuggestion = ref(0)
const suggestionsDismissed = ref(false)
let selectingSuggestion = false

const suggestionCatalog = [
  'create a website',
  'create a website for free',
  'create a website with AI',
  'create a website for my business',
  'create a website for free with AI',
  'create a drop-down list in Excel',
  'create a study plan',
  'create a business plan',
  'create a professional resume',
  'write an email',
  'write a cover letter',
  'write a project proposal',
  'write a short story',
  'write a social media post',
  'build a mobile app',
  'build a portfolio website',
  'build a weekly meal plan',
  'explain this in simple terms',
  'explain this step by step',
  'explain how artificial intelligence works',
  'help me learn a new skill',
  'help me learn English',
  'help me learn programming',
  'help me prepare for an interview',
  'help me plan a trip',
  'help me solve this problem',
  'translate this into Kinyarwanda',
  'summarize this text',
  'give me ideas for a small business',
  'give me a beginner-friendly workout plan',
  'make this more professional',
  'make this shorter and clearer',
  'compare these options',
  'debug my code',
  'generate Python code',
  'plan a productive day',
  'recommend books about'
]

const suggestions = computed(() => {
  const query = inputVal.value.trim().toLocaleLowerCase()
  if (!props.suggestionsEnabled || query.length < 3 || attachments.value.length || props.disabled) return []
  const matches = suggestionCatalog.filter(item => item.toLocaleLowerCase().startsWith(query))
  if (matches.length) return matches.slice(0, 6)
  return [
    `${inputVal.value.trim()} step by step`,
    `${inputVal.value.trim()} with examples`,
    `${inputVal.value.trim()} for beginners`,
    `${inputVal.value.trim()} in simple terms`,
    `${inputVal.value.trim()} for my business`,
    `${inputVal.value.trim()} and explain why`
  ].slice(0, 6)
})
const showSuggestions = computed(() =>
  props.suggestionsEnabled && focused.value && !suggestionsDismissed.value && suggestions.value.length > 0
)

watch(inputVal, () => {
  if (selectingSuggestion) {
    selectingSuggestion = false
    return
  }
  suggestionsDismissed.value = false
  activeSuggestion.value = 0
})

/* ── Attach menu ─────────────────────────────────────────────── */
const attachOpen = ref(false)
const pickKind   = ref('image')
const attachWrapEl = ref(null)

const ACCEPT = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  document: '.pdf,.txt,.md,.csv,.json,.docx,.py,.js,.ts,.html,.css,.xml,.yaml,.yml'
}
function acceptFor(kind) { return ACCEPT[kind] || '*' }

function pickFile(kind) {
  pickKind.value = kind
  attachOpen.value = false
  nextTick(() => { fileRef.value?.click() })
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const IMAGE_MAX = 4 * 1024 * 1024
const DOC_MAX   = 15 * 1024 * 1024
const DOC_EXTS  = /\.(pdf|txt|md|csv|json|docx|py|js|ts|html|css|xml|yaml|yml)$/i
const MAX_FILES = 4

/* Friendly type labels (§11) — never a raw MIME string. */
function kindLabelFor(name, mime) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if ((mime || '').startsWith('image/')) return 'Image'
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'Document'
  if (['xls', 'xlsx'].includes(ext)) return 'Spreadsheet'
  if (['ppt', 'pptx'].includes(ext)) return 'Presentation'
  if (['txt', 'md'].includes(ext)) return 'Text'
  if (['csv', 'json', 'xml', 'yaml', 'yml'].includes(ext)) return ext.toUpperCase()
  if (['py', 'js', 'ts', 'html', 'css'].includes(ext)) return 'Code'
  return 'Document'
}

function sizeLabelFor(bytes) {
  return bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'
}

/* Client-side image downscale (§33): oversized images are the #1
   cause of vision-model rejections — resize before upload instead of
   failing at the provider. Returns the (possibly new) File.       */
function compressImage(file) {
  return new Promise((resolve) => {
    if (file.type === 'image/gif') return resolve(file) // animation cannot be re-encoded
    const needsResize = file.size > 2.5 * 1024 * 1024
    if (!needsResize || !window.createImageBitmap || !document.createElement) return resolve(file)
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_DIM = 2560
      let { width, height } = img
      if (width <= MAX_DIM && height <= MAX_DIM && file.size <= IMAGE_MAX) return resolve(file)
      const scale = Math.min(1, MAX_DIM / Math.max(width, height))
      width = Math.round(width * scale); height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(file)
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) return resolve(file)
        const resized = new File([blob], file.name.replace(/\.(jpe?g|png|webp)$/i, '.jpg'), { type: 'image/jpeg' })
        resolve(resized.size < file.size ? resized : file)
      }, 'image/jpeg', 0.86)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

/* Validate + add files (frontend truth; the backend re-validates
   everything — §12). Unsupported/too-large files get a friendly
   inline notice, never a raw error.                              */
async function addFiles(fileList) {
  const files = Array.from(fileList || [])
  if (!files.length) return
  for (const original of files) {
    if (attachments.value.length >= MAX_FILES) {
      showNotice(`You can attach up to ${MAX_FILES} files per message.`)
      break
    }
    const isImg = (original.type || '').startsWith('image/')
    let f = original
    if (isImg) {
      if (!IMAGE_TYPES.includes(original.type)) { showNotice(`"${original.name}" is not a supported image. Use JPG, PNG, GIF or WebP.`); continue }
      f = await compressImage(original)
      if (f.size > IMAGE_MAX) { showNotice(`"${original.name}" is too large. Maximum image size is 4 MB.`); continue }
    } else {
      const ext = '.' + (original.name.split('.').pop() || '').toLowerCase()
      if (['.xls', '.xlsx', '.ppt', '.pptx', '.doc'].includes(ext)) {
        showNotice(`"${original.name}" (${kindLabelFor(original.name, original.type)}) isn't supported yet. Try PDF, DOCX, TXT or CSV.`)
        continue
      }
      if (!DOC_EXTS.test(original.name)) { showNotice(`"${original.name}" is a file type KinyaBot can't read yet. Try images, PDF, DOCX, TXT, CSV, JSON or code files.`); continue }
      if (f.size > DOC_MAX) { showNotice(`"${original.name}" is too large. Maximum document size is 15 MB.`); continue }
    }
    attachments.value = [...attachments.value, {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      isImg,
      url: isImg ? URL.createObjectURL(f) : null,
      name: f.name,
      sizeLabel: sizeLabelFor(f.size),
      kindLabel: isImg ? null : kindLabelFor(f.name, f.type),
      icon: isImg ? 'fas fa-image' : (f.name.toLowerCase().endsWith('.pdf') ? 'fas fa-file-pdf' : 'fas fa-file-lines'),
    }]
    fileTrigger.value += 1
  }
}

function removeAttachment(id) {
  const att = attachments.value.find(a => a.id === id)
  if (att?.url?.startsWith('blob:')) URL.revokeObjectURL(att.url)
  attachments.value = attachments.value.filter(a => a.id !== id)
}

function clearAttachments() {
  attachments.value.forEach(a => { if (a.url?.startsWith('blob:')) URL.revokeObjectURL(a.url) })
  attachments.value = []
  if (fileRef.value) fileRef.value.value = ''
}

function handleFile(e) {
  const picked = Array.from(e.target.files || [])
  if (!picked.length) return
  e.target.value = '' // allow re-picking the same file after removal
  addFiles(picked)
}

/* Paste images/files straight into the composer (modern UX staple) */
function onPaste(e) {
 const pasted = Array.from(e.clipboardData?.files || [])
  if (!pasted.length) return
  const images = pasted.filter(f => (f.type || '').startsWith('image/'))
  if (!images.length) return // let text paste flow normally
  e.preventDefault()
  addFiles(images)
}

let noticeTimer = null
function showNotice(msg) {
  notice.value = msg
  noticeTrigger.value += 1
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 6000)
}

/* Close attach menu on outside click */
function onDocClick(e) {
  if (attachOpen.value && attachWrapEl.value && !attachWrapEl.value.contains(e.target)) attachOpen.value = false
}

/* ── Composer basics ─────────────────────────────────────────── */
const placeholder = computed(() =>
  window.innerWidth <= 768 ? 'Message KinyaBot' : 'Ask me anything…'
)

/* External text injection (restored pending message, suggestion chips) */
watch(() => props.injectedText, (val) => {
  if (!val) return
  inputVal.value = val
  clearAttachments()
  nextTick(() => { resize(); taRef.value?.focus() })
})

/* External single file injection (restored pending attachment after sign-in) */
watch(() => props.injectedFile, (f) => {
  if (!f) return
  addFiles([f])
  nextTick(() => { resize(); taRef.value?.focus() })
})

/* External batch injection (drag & drop, §10) */
watch(() => props.injectedFiles, (files) => {
  if (!files || !files.length) return
  addFiles(files)
  emit('files-consumed')
  nextTick(() => { resize(); taRef.value?.focus() })
})

function resize() {
  const el = taRef.value; if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function onFocus() {
  focused.value = true
  suggestionsDismissed.value = false
  // ChatWindow scrolls to the latest message when the composer is focused
  emit('focus')
}

function handleSuggestionEnter() {
  if (showSuggestions.value) {
    selectSuggestion(suggestions.value[activeSuggestion.value])
    return
  }
  submit()
}

function moveSuggestion(direction, event) {
  if (!showSuggestions.value) return
  event.preventDefault()
  const count = suggestions.value.length
  activeSuggestion.value = (activeSuggestion.value + direction + count) % count
}

function selectSuggestion(suggestion) {
  selectingSuggestion = inputVal.value !== suggestion
  inputVal.value = suggestion
  suggestionsDismissed.value = true
  nextTick(() => {
    resize()
    taRef.value?.focus()
  })
}

function dismissSuggestions() {
  suggestionsDismissed.value = true
}

function submit() {
  const content = inputVal.value.trim()
  const files = attachments.value.map(a => a.file)
  if (!content && !files.length) return
  sendTrigger.value += 1
  emit('send', { content, files })
  // Guest mode keeps the draft so closing the auth gate returns the
  // user to their message exactly as they typed it.
  if (props.preserveOnSend) return
  inputVal.value = ''
  clearAttachments()
  nextTick(() => { if (taRef.value) { taRef.value.style.height = 'auto'; taRef.value.focus() } })
}

/* ── Voice input: record → backend speech-to-text → editable text ──
   The transcript lands in the composer for review/editing first —
   it is never auto-sent (spec §11).                                */
const isRec        = ref(false)
const transcribing = ref(false)
const recTime      = ref('')
let mediaRecorder  = null
let recChunks      = []
let recStream      = null
let tickInterval   = null
let recStart       = 0
const MAX_REC_MS   = 120000

function fmtTime(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function pickMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find(c => window.MediaRecorder?.isTypeSupported?.(c)) || ''
}

async function toggleVoice() {
  if (isRec.value) { stopRecording(); return }
  if (transcribing.value) return

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showNotice('Voice input is not supported in this browser. Try Chrome, Edge or Safari.')
    return
  }
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError')
      showNotice('Microphone access was denied. Allow the microphone in your browser settings and try again.')
    else if (err?.name === 'NotFoundError')
      showNotice('No microphone was found on this device.')
    else
      showNotice('The microphone could not be started. Please try again.')
    return
  }

  try {
    recChunks = []
    const mime = pickMime()
    mediaRecorder = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream)
    mediaRecorder.ondataavailable = (e) => { if (e.data?.size) recChunks.push(e.data) }
    mediaRecorder.onstop = onRecordStop
    mediaRecorder.start(250)
  } catch {
    cleanupRecording()
    showNotice('Recording could not start. Please try again.')
    return
  }

  isRec.value = true
  recStart = Date.now()
  recTime.value = '0:00'
  tickInterval = setInterval(() => {
    const ms = Date.now() - recStart
    recTime.value = fmtTime(ms)
    if (ms >= MAX_REC_MS) stopRecording()
  }, 500)
}

function stopRecording() {
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  clearInterval(tickInterval)
  isRec.value = false
}

async function onRecordStop() {
  cleanupRecording()
  if (!recChunks.length) { showNotice('The recording was empty. Please try again.'); return }
  const mime = mediaRecorder?.mimeType || 'audio/webm'
  const ext  = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
  const blob = new Blob(recChunks, { type: mime })
  recChunks = []
  if (blob.size < 1200) { showNotice('The recording was too short. Hold the mic a little longer.'); return }

  transcribing.value = true
  try {
    const fd = new FormData()
    fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
    const { data } = await api.post('/stt', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
    const text = (data?.text || '').trim()
    if (!text) { showNotice('KinyaBot could not hear anything in that recording. Try speaking a bit louder.'); return }
    // Transcript lands in the composer as EDITABLE text (never auto-sent)
    inputVal.value += (inputVal.value ? ' ' : '') + text
    nextTick(() => { resize(); taRef.value?.focus() })
  } catch (err) {
    const msg = err?.response?.data?.error
    showNotice(msg || 'Transcription failed. Please check your connection and try again.')
  } finally {
    transcribing.value = false
  }
}

function cleanupRecording() {
  recStream?.getTracks?.().forEach(t => t.stop())
  recStream = null
  mediaRecorder = null
}

function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); nextTick(() => taRef.value?.focus()) }
  if (e.key === 'Escape') {
    taRef.value?.blur()
    attachOpen.value = false
    if (isRec.value) stopRecording()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('click', onDocClick)
  stopRecording()
  cleanupRecording()
  clearTimeout(noticeTimer)
})
</script>

<style scoped>
.input-area {
  flex-shrink: 0;
  padding: 4px 12px;
  padding-bottom: calc(max(10px, env(safe-area-inset-bottom)) + var(--kb, 0px));
  background: var(--bg-base);
  position: sticky;
  bottom: 0;
  z-index: 10;
}

/* Inline notice */
.inline-notice {
  display:flex; align-items:center; gap:8px;
  padding:8px 12px; margin-bottom:5px;
  background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.25);
  border-radius:10px; font-size:12.5px; color:var(--warning);
  animation:fadeUp .25s ease;
}
.inline-notice i { flex-shrink:0; }
.inline-notice span { flex:1; }
.in-x { background:none; border:none; color:var(--text-3); font-size:13px; cursor:pointer; padding:2px 4px; border-radius:5px; }
.in-x:hover { color:var(--text-1); background:var(--bg-hover); }

/* Attachment previews (multiple chips, §9/§13) */
.att-row { display:flex; align-items:stretch; gap:8px; padding:0 2px 8px; flex-wrap:wrap; }
.att-chip {
  position:relative; display:flex; align-items:center; gap:8px; max-width:230px;
  padding:6px 30px 6px 6px; background:var(--bg-card); border:1px solid var(--border-md);
  border-radius:12px; transition:border-color .15s, transform .15s;
}
.att-chip:hover { border-color:var(--brand); }
.att-chip.is-img { padding:5px 28px 5px 5px; }
.attc-thumb { width:44px; height:44px; object-fit:cover; border-radius:8px; flex-shrink:0; }
.attc-ic { width:36px; height:36px; border-radius:8px; background:var(--bg-input); display:flex; align-items:center; justify-content:center; color:var(--brand-text); font-size:14px; flex-shrink:0; }
.attc-body { display:flex; flex-direction:column; min-width:0; }
.attc-name { display:block; max-width:150px; font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-1); }
.attc-size { font-size:10.5px; color:var(--text-3); }
.attc-size b { font-weight:600; }
.attc-x {
  position:absolute; top:-6px; right:-6px; width:20px; height:20px;
  display:flex; align-items:center; justify-content:center;
  background:var(--bg-active, #333); border:1px solid var(--border-md); border-radius:50%;
  color:var(--text-2); font-size:10px; cursor:pointer; transition:all .15s;
}
.attc-x:hover { background:var(--red, #ef4444); color:#fff; border-color:transparent; }

/* Input box */
.input-area.centered { padding: 0 0 2px; background: transparent; position: static; }
.input-box {
  border: 1px solid var(--border-md); border-radius: 18px;
  position:relative;
  background: var(--bg-input); overflow: visible;
  transition: border-color .2s, box-shadow .2s;
}
.input-box.focused { border-color:rgba(99,102,241,.45); box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.input-box.sending { opacity:.75; }

/* Attach menu */
.attach-wrap { position:relative; display:flex; }
.attach-menu {
  position:absolute; bottom:calc(100% + 8px); left:0;
  min-width:230px; background:var(--bg-card);
  border:1px solid var(--border-md); border-radius:12px;
  padding:6px; z-index:30;
  box-shadow:0 12px 32px rgba(0,0,0,.45);
  animation:popIn .16s ease;
}
@keyframes popIn { from { opacity:0; transform:translateY(6px) scale(.97); } to { opacity:1; transform:none; } }
.am-item {
  display:flex; align-items:center; gap:10px; width:100%;
  padding:9px 10px; background:none; border:none; border-radius:8px;
  color:var(--text-2); cursor:pointer; text-align:left; transition:all .15s;
}
.am-item:hover { background:var(--bg-hover); color:var(--text-1); }
.am-item i { width:30px; height:30px; border-radius:8px; background:rgba(99,102,241,.16); border:1px solid rgba(99,102,241,.3); color:var(--brand-text); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
.am-item b { display:block; font-size:12.5px; font-weight:600; color:var(--text-1); }
.am-item small { display:block; font-size:10.5px; color:var(--text-3); margin-top:1px; }

/* Voice waveform */
.wave-bar { padding:8px 13px 4px; border-bottom:1px solid var(--border); display:flex; flex-direction:column; gap:5px; }
.wave-info { display:flex; align-items:center; gap:7px; font-size:12px; color:var(--text-2); flex-wrap:wrap; }
.wave-info span:first-of-type { color:var(--accent-cyan); font-weight:500; }
.wave-hint { color:var(--text-3); font-style:italic; }

/* Textarea */
.chat-ta {
  width:100%; min-height:42px; max-height:160px;
  background:none; border:none; color:var(--text-1);
  font-size:14px; line-height:1.55; padding:11px 13px 4px;
  resize:none; display:block; outline:none; font-family:inherit;
}
.chat-ta::placeholder { color:var(--text-3); }
.chat-ta:disabled { cursor:not-allowed; opacity:.5; }

/* Toolbar */
.toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:5px 8px 7px; gap:6px;
}
.prompt-suggestions {
  position:absolute; z-index:30; top:calc(100% + 1px); left:-1px; right:-1px;
  padding:8px; background:var(--bg-input); border:1px solid var(--border-md);
  border-top:1px solid var(--border); border-radius:0 0 var(--r-input) var(--r-input);
  box-shadow:0 14px 30px rgba(0,0,0,.2);
}
.input-box.has-suggestions { border-bottom-left-radius:0; border-bottom-right-radius:0; }
.prompt-suggestion {
  display:flex; align-items:center; gap:12px; width:100%; min-height:42px; padding:8px 10px;
  border:0; border-radius:10px; background:transparent; color:var(--text-1);
  text-align:left; font-size:14px; cursor:pointer;
}
.prompt-suggestion > i:first-child { width:16px; flex-shrink:0; color:var(--text-3); font-size:13px; }
.prompt-suggestion span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.prompt-suggestion:hover,.prompt-suggestion.selected { background:var(--bg-hover); }
.suggestion-open { color:var(--accent-cyan); font-size:12px; }
.prompt-suggestion:focus-visible { outline:2px solid var(--brand-text); outline-offset:-2px; }
.input-area:not(.centered) .prompt-suggestions {
  top:auto; bottom:calc(100% + 8px); border:1px solid var(--border-md); border-radius:var(--r-input);
}
.tl-left,.tl-right { display:flex; align-items:center; gap:5px; }

.tb-btn {
  display:flex; align-items:center; gap:5px; padding:5px 10px;
  background:var(--bg-card); border:1px solid var(--border-md);
  border-radius:99px; color:var(--text-2); font-size:12.5px;
  cursor:pointer; transition:all .2s; white-space:nowrap;
}
.tb-btn:hover { background:var(--bg-hover); color:var(--text-1); }
.tb-btn.on { background:rgba(99,102,241,.2); border-color:rgba(99,102,241,.4); color:var(--brand-text); }
.tb-btn i { font-size:12px; }

.tb-ico {
  width:32px; height:32px; border-radius:50%;
  background:none; border:none; color:var(--text-2); font-size:14px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s; flex-shrink:0;
}
.tb-ico:hover:not(:disabled) { background:var(--bg-hover); color:var(--text-1); }
.tb-ico:disabled { opacity:.5; cursor:not-allowed; }
.tb-ico.rec { color:var(--accent-cyan); background:rgba(242,139,130,.15); }

.send-btn {
  width:34px; height:34px; border-radius:50%;
  background:var(--accent-solid);
  border:none; color:var(--on-accent); font-size:13px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s; flex-shrink:0;
  box-shadow:0 2px 10px rgba(99,102,241,.28);
}
.send-btn:hover:not(:disabled) { transform:scale(1.1); box-shadow:0 4px 16px rgba(99,102,241,.45); }
.send-btn:disabled { opacity:.32; cursor:not-allowed; transform:none; }

.disclaimer { font-size:11px; color:var(--text-3); text-align:center; margin-top:5px; padding:0 4px; }

/* ── MOBILE ─── */
@media(max-width:600px) {
  .input-area {
    padding: 4px 8px calc(max(10px, env(safe-area-inset-bottom)) + var(--kb, 0px));
  }
  .tb-label   { display:none; }
  .tb-btn     { padding:6px 8px; }
  .chat-ta    { font-size:16px; padding:11px 11px 4px; max-height:120px; }
  .disclaimer { font-size:10px; }
  .attach-menu { left:-70px; min-width:220px; }
  .wave-hint { display:none; }
}

@media(max-width:380px) {
  .wave-info  { font-size:11px; }
  .attach-menu { left:-100px; min-width:210px; }
}

/* ═══════════ MOBILE (≤768px): pill composer ═══════════ */
@media(max-width:768px){
  .input-area { background:var(--bg-base); padding:4px 14px calc(max(10px, env(safe-area-inset-bottom)) + var(--kb, 0px)); }
  .disclaimer { display:none; }
  .input-box { display:flex; flex-wrap:wrap; align-items:center; gap:0; padding:4px 4px 4px 6px; border-radius:27px; background:var(--bg-card); border:1px solid var(--border-md); }
  .input-box.focused { border-color:var(--accent-solid); box-shadow:0 0 0 3px rgba(99,102,241,.12); }
  .wave-bar { order:-1; width:100%; }
  .toolbar { display:contents; }
  .tl-left { order:0; }
  .chat-ta { order:1; flex:1 1 0; width:auto; min-width:0; min-height:40px; padding:10px 8px; font-size:16px; }
  .tl-right { order:2; }
  .tb-btn { width:36px; height:36px; padding:0; justify-content:center; border-radius:50%; background:transparent; border:none; color:var(--purple); }
  .tb-btn i { font-size:15px; }
  .tl-left > .tb-btn { display:none; } /* Deep Think stays on desktop */
  .attach-menu { left:0; bottom:calc(100% + 12px); border-radius:16px; }
  .am-item { min-height:48px; }

  /* mic when empty → send when there is something to send */
  .tl-right .tb-ico, .send-btn { width:40px; height:40px; border-radius:50%; background:var(--accent-solid); color:var(--on-accent); font-size:15px; }
  .tl-right .tb-ico.rec { background:var(--red); color:#fff; }
  .input-box.has-text .tl-right .tb-ico:not(.rec) { display:none; }
  .input-box:not(.has-text) .send-btn { display:none; }
  .send-btn:disabled { opacity:.5; }
  .att-row { border-radius:16px; }
}
</style>
