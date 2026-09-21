<template>
  <div class="input-area">
    <!-- Client-side error notice (invalid / too-large file, STT failure) -->
    <transition name="fade">
      <div v-if="notice" class="inline-notice" role="alert">
        <i class="fas fa-triangle-exclamation"></i>
        <span>{{ notice }}</span>
        <button class="in-x" @click="notice=''" aria-label="Dismiss notice"><i class="fas fa-xmark"></i></button>
      </div>
    </transition>

    <!-- Attachment preview -->
    <transition name="fade">
      <div v-if="filePreview" class="fp-row">
        <img v-if="filePreview.isImg" :src="filePreview.url" class="fp-thumb" alt="Attachment preview" />
        <div v-else class="fp-icon"><i :class="filePreview.icon"></i></div>
        <div class="fp-meta">
          <span class="fp-name">{{ filePreview.name }}</span>
          <span class="fp-size">{{ filePreview.size }}</span>
        </div>
        <button class="fp-x" @click="removeFile" aria-label="Remove attachment" title="Remove attachment"><i class="fas fa-xmark"></i></button>
      </div>
    </transition>

    <div class="input-box" :class="{ focused, sending: disabled }">
      <!-- Voice waveform -->
      <transition name="fade">
        <div v-if="isRec || transcribing" class="wave-bar">
          <div class="wave-info">
            <i :class="transcribing ? 'fas fa-spinner fa-spin' : 'fas fa-microphone'" style="color:#f28b82"></i>
            <span v-if="transcribing">Transcribing your recording…</span>
            <template v-else>
              <span>Listening{{ recTime ? ` · ${recTime}` : '' }}</span>
              <span class="wave-hint">Press the mic again to transcribe</span>
            </template>
          </div>
          <div class="wave-bars">
            <div v-for="n in 16" :key="n" class="wb" :style="waveStyle(n)"></div>
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
        @focus="onFocus"
        @blur="focused=false"
        @keydown.enter.exact.prevent="submit"
        @keydown.enter.shift.exact="() => {}"
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
              <i class="fas fa-paperclip"></i>
              <span class="tb-label">Attach</span>
            </button>
            <transition name="pop">
              <div v-if="attachOpen" class="attach-menu" role="menu">
                <button class="am-item" role="menuitem" @click="pickFile('image')">
                  <i class="fas fa-image"></i>
                  <span>
                    <b>Image</b>
                    <small>JPG, PNG, GIF, WebP · up to 4 MB</small>
                  </span>
                </button>
                <button class="am-item" role="menuitem" @click="pickFile('document')">
                  <i class="fas fa-file-lines"></i>
                  <span>
                    <b>Document</b>
                    <small>PDF, DOCX, TXT, CSV, code · up to 15 MB</small>
                  </span>
                </button>
              </div>
            </transition>
            <input ref="fileRef" type="file" :accept="acceptFor(pickKind)" @change="handleFile" hidden />
          </div>
          <button class="tb-btn" :class="{on: deepThink}" @click="deepThink=!deepThink" title="Deep Think">
            <i class="fas fa-brain"></i>
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
            <i v-if="transcribing" class="fas fa-spinner fa-spin"></i>
            <i v-else :class="isRec ? 'fas fa-stop' : 'fas fa-microphone'"></i>
          </button>
          <button class="send-btn" :disabled="disabled || (!inputVal.trim() && !selectedFile)" @click="submit" aria-label="Send message" title="Send (Enter)">
            <i v-if="disabled" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>

    <p class="disclaimer">KinyaBot may make mistakes. Verify important info. · POWERED BY AFASA</p>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import api from '../api'

const props = defineProps({
  disabled: Boolean,
  // Guest mode: keep the typed message in the composer when the
  // auth gate fires, so nothing the user wrote is ever lost.
  preserveOnSend: Boolean,
  // Text injected from outside (restored pending message / guest chips)
  injectedText: { type: String, default: '' }
})
const emit  = defineEmits(['send', 'focus'])

const inputVal     = ref('')
const selectedFile = ref(null)
const filePreview  = ref(null)
const focused      = ref(false)
const deepThink    = ref(false)
const notice       = ref('')
const taRef        = ref(null)
const fileRef      = ref(null)
const waveH        = ref(Array(16).fill(4))

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

function handleFile(e) {
  const f = e.target.files[0]
  if (!f) return
  e.target.value = '' // allow re-picking the same file after removal

  if (pickKind.value === 'image' || (f.type || '').startsWith('image/')) {
    if (!IMAGE_TYPES.includes(f.type)) { showNotice('That image format is not supported. Use JPG, PNG, GIF or WebP.'); return }
    if (f.size > IMAGE_MAX) { showNotice('That image is too large. Maximum size is 4 MB.'); return }
    selectedFile.value = f
    filePreview.value = { name: f.name, size: (f.size / 1024).toFixed(0) + ' KB', isImg: true, url: URL.createObjectURL(f), icon: 'fas fa-image' }
    return
  }

  if (!DOC_EXTS.test(f.name)) { showNotice('That document type is not supported. Use PDF, DOCX, TXT, CSV, JSON or code files.'); return }
  if (f.size > DOC_MAX) { showNotice('That document is too large. Maximum size is 15 MB.'); return }
  selectedFile.value = f
  filePreview.value = { name: f.name, size: (f.size / 1024).toFixed(0) + ' KB', isImg: false, url: null, icon: 'fas fa-file-lines' }
}

function removeFile() {
  if (filePreview.value?.url?.startsWith('blob:')) URL.revokeObjectURL(filePreview.value.url)
  selectedFile.value = null; filePreview.value = null
  if (fileRef.value) fileRef.value.value = ''
}

let noticeTimer = null
function showNotice(msg) {
  notice.value = msg
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 6000)
}

/* Close attach menu on outside click */
function onDocClick(e) {
  if (attachOpen.value && attachWrapEl.value && !attachWrapEl.value.contains(e.target)) attachOpen.value = false
}

/* ── Composer basics ─────────────────────────────────────────── */
const placeholder = computed(() =>
  window.innerWidth < 480 ? 'Ask anything…' : 'Ask me anything…'
)

/* External text injection (restored pending message, suggestion chips) */
watch(() => props.injectedText, (val) => {
  if (!val) return
  inputVal.value = val
  removeFile()
  nextTick(() => { resize(); taRef.value?.focus() })
})

function resize() {
  const el = taRef.value; if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function onFocus() {
  focused.value = true
  // ChatWindow scrolls to the latest message when the composer is focused
  emit('focus')
}

function submit() {
  const content = inputVal.value.trim()
  if (!content && !selectedFile.value) return
  emit('send', { content, file: selectedFile.value })
  // Guest mode keeps the draft so closing the auth gate returns the
  // user to their message exactly as they typed it.
  if (props.preserveOnSend) return
  inputVal.value = ''
  removeFile()
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
let waveInterval   = null
let tickInterval   = null
let recStart       = 0
const MAX_REC_MS   = 120000

function startWave() { waveInterval = setInterval(() => { waveH.value = Array(16).fill(0).map(() => Math.random() * 22 + 4) }, 80) }
function stopWave()  { clearInterval(waveInterval); waveH.value = Array(16).fill(4) }

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
  startWave()
}

function stopRecording() {
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  clearInterval(tickInterval)
  stopWave()
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
  stopWave()
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
  border-radius:10px; font-size:12.5px; color:#fcd34d;
  animation:fadeUp .25s ease;
}
.inline-notice i { flex-shrink:0; }
.inline-notice span { flex:1; }
.in-x { background:none; border:none; color:var(--text-3); font-size:13px; cursor:pointer; padding:2px 4px; border-radius:5px; }
.in-x:hover { color:var(--text-1); background:var(--bg-hover); }

/* Attachment preview */
.fp-row { display:flex; align-items:center; gap:9px; padding:7px 11px; margin-bottom:5px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:10px; }
.fp-thumb { width:38px; height:38px; object-fit:cover; border-radius:6px; flex-shrink:0; }
.fp-icon { width:38px; height:38px; border-radius:6px; background:var(--bg-input); display:flex; align-items:center; justify-content:center; color:var(--text-2); flex-shrink:0; }
.fp-meta { flex:1; min-width:0; }
.fp-name { display:block; font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-1); }
.fp-size { font-size:11px; color:var(--text-3); }
.fp-x { background:none; border:none; color:var(--text-3); font-size:13px; cursor:pointer; padding:4px; border-radius:5px; transition:all .2s; flex-shrink:0; }
.fp-x:hover { background:var(--bg-hover); color:var(--red); }

/* Input box */
.input-box {
  border: 1px solid var(--border-md); border-radius: 14px;
  background: var(--bg-input); overflow: visible;
  transition: border-color .2s, box-shadow .2s;
}
.input-box.focused { border-color:rgba(109,40,217,.5); box-shadow:0 0 0 3px rgba(109,40,217,.1); }
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
.am-item i { width:30px; height:30px; border-radius:8px; background:rgba(109,40,217,.16); border:1px solid rgba(109,40,217,.3); color:#c4b5fd; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
.am-item b { display:block; font-size:12.5px; font-weight:600; color:var(--text-1); }
.am-item small { display:block; font-size:10.5px; color:var(--text-3); margin-top:1px; }

/* Voice waveform */
.wave-bar { padding:8px 13px 4px; border-bottom:1px solid var(--border); display:flex; flex-direction:column; gap:5px; }
.wave-info { display:flex; align-items:center; gap:7px; font-size:12px; color:var(--text-2); flex-wrap:wrap; }
.wave-info span:first-of-type { color:#f28b82; font-weight:500; }
.wave-hint { color:var(--text-3); font-style:italic; }
.wave-bars { display:flex; align-items:center; gap:2px; height:28px; }
.wb { width:3px; border-radius:99px; background:linear-gradient(180deg,#f28b82,#a855f7); transition:height .08s ease; min-height:3px; }

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
.tl-left,.tl-right { display:flex; align-items:center; gap:5px; }

.tb-btn {
  display:flex; align-items:center; gap:5px; padding:5px 10px;
  background:var(--bg-card); border:1px solid var(--border-md);
  border-radius:99px; color:var(--text-2); font-size:12.5px;
  cursor:pointer; transition:all .2s; white-space:nowrap;
}
.tb-btn:hover { background:var(--bg-hover); color:var(--text-1); }
.tb-btn.on { background:rgba(109,40,217,.2); border-color:rgba(109,40,217,.4); color:#c4b5fd; }
.tb-btn i { font-size:12px; }

.tb-ico {
  width:32px; height:32px; border-radius:50%;
  background:none; border:none; color:var(--text-2); font-size:14px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s; flex-shrink:0;
}
.tb-ico:hover:not(:disabled) { background:var(--bg-hover); color:var(--text-1); }
.tb-ico:disabled { opacity:.5; cursor:not-allowed; }
.tb-ico.rec { color:#f28b82; background:rgba(242,139,130,.15); animation:pulse 1.1s infinite; }

.send-btn {
  width:34px; height:34px; border-radius:50%;
  background:linear-gradient(135deg,#4f46e5,#7c3aed);
  border:none; color:#fff; font-size:13px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s; flex-shrink:0;
  box-shadow:0 2px 8px rgba(79,70,229,.35);
}
.send-btn:hover:not(:disabled) { transform:scale(1.1); box-shadow:0 4px 14px rgba(79,70,229,.5); }
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
  .wave-bars  { height:22px; }
  .attach-menu { left:-100px; min-width:210px; }
}
</style>
